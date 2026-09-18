import { cookies } from "next/headers";
import {
  authClient,
  actorIn,
  cookieName,
  cookieOptions,
  withActor,
} from "@/utils/auth";
import { pool, transaction, audit } from "@/utils/db";
import { hash, token } from "@/utils/crypto";
import { randomInt } from "node:crypto";
import { sendLoginCode } from "@/utils/email";
import { bodyOf, failure, json } from "@/utils/http";
import { AppError } from "@/src/access";
import { passwordValid } from "@/src/validation";

export const runtime = "nodejs";
async function throttle(key: string, max: number, seconds: number) {
  const { rows } = await pool().query(
    `insert into plu_private.rate_limits(key,count,reset_at) values($1,1,now()+$2*interval '1 second')
    on conflict(key) do update set count=case when plu_private.rate_limits.reset_at<now() then 1 else plu_private.rate_limits.count+1 end,
    reset_at=case when plu_private.rate_limits.reset_at<now() then excluded.reset_at else plu_private.rate_limits.reset_at end returning count`,
    [hash(key), seconds],
  );
  if (rows[0].count > max)
    throw new AppError("Too many attempts. Please try again later.", 429);
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const body = await bodyOf(request),
      { action } = await context.params;
    const jar = await cookies();
    if (action === "logout") {
      const raw = jar.get(cookieName)?.value;
      if (raw)
        await pool().query(
          "delete from plu_private.sessions where token_hash=$1",
          [hash(raw)],
        );
      jar.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
      return json({ ok: true });
    }
    if (action === "login") {
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        typeof body.password !== "string" ||
        !body.password ||
        body.password.length > 128
      )
        throw new AppError("Enter your email and password.");
      await throttle(`login:${email}`, 10, 900);
      const initial = (
        await pool().query(
          "select id, security_version from plu_private.users where email=$1 and active",
          [email],
        )
      ).rows[0];
      const auth = authClient();
      const { data, error } = await auth.auth.signInWithPassword({
        email,
        password: body.password,
      });
      if (error || !initial || data.user?.id !== initial.id)
        throw new AppError(
          "Email or password is incorrect, or the account is inactive.",
          401,
        );
      // Supabase tokens are never returned to the browser or accepted as app sessions.
      await auth.auth.signOut({ scope: "local" });
      const raw = token();
      const result = await transaction(async (db) => {
        const user = (
          await db.query(
            "select * from plu_private.users where id=$1 for update",
            [initial.id],
          )
        ).rows[0];
        if (!user.active || user.security_version !== initial.security_version)
          throw new AppError("Account security changed. Sign in again.", 401);
        const stage = user.otp_enabled
          ? "otp"
          : user.must_change_password
            ? "password"
            : "complete";
        const code =
          stage === "otp"
            ? process.env.TEST_AUTH_PROVIDER === "1"
              ? "123456"
              : String(randomInt(100000, 1000000))
            : null;
        // Starting another login invalidates earlier incomplete challenges for this account.
        await db.query(
          "delete from plu_private.sessions where user_id=$1 and stage<>'complete'",
          [user.id],
        );
        await db.query(
          "insert into plu_private.sessions(token_hash,user_id,stage,security_version,expires_at,otp_hash,otp_expires_at) values($1,$2,$3,$4,now()+$5*interval '1 second',$6,case when $6 is null then null else now()+interval '10 minutes' end)",
          [
            hash(raw),
            user.id,
            stage,
            user.security_version,
            stage === "complete" ? 28800 : 600,
            code ? hash(code) : null,
          ],
        );
        if (code)
          try {
            await sendLoginCode(user.email, code);
          } catch {
            throw new AppError(
              "Unable to send your email code. Contact your administrator or try again later.",
              503,
            );
          }
        await audit(db, user.id, "auth.password_verified", null, user.id, {
          next: stage,
        });
        return { stage };
      });
      jar.set(cookieName, raw, cookieOptions);
      return json(result);
    }
    if (action === "otp") {
      const raw = jar.get(cookieName)?.value;
      if (!raw)
        throw new AppError("Start again with your email and password.", 401);
      await throttle(`otp:${hash(raw)}`, 5, 600);
      const next = await transaction(async (db) => {
        const actor = await actorIn(db, raw, false);
        if (actor.stage !== "otp")
          throw new AppError("No pending email verification.", 401);
        if (typeof body.code !== "string" || !/^\d{6,10}$/.test(body.code))
          throw new AppError("Enter the code from your email.");
        if (
          !actor.otp_hash ||
          !actor.otp_expires_at ||
          new Date(actor.otp_expires_at).getTime() <= Date.now() ||
          hash(body.code) !== actor.otp_hash
        )
          throw new AppError("The code is incorrect or expired.", 401);
        const stage = actor.must_change_password ? "password" : "complete";
        const replacement = token();
        await db.query(
          "update plu_private.sessions set token_hash=$2,stage=$3,expires_at=now()+$4*interval '1 second',otp_hash=null,otp_expires_at=null where token_hash=$1",
          [
            actor.session_hash,
            hash(replacement),
            stage,
            stage === "complete" ? 28800 : 600,
          ],
        );
        await audit(db, actor.id, "auth.otp_verified", null, actor.id);
        return { stage, replacement };
      });
      jar.set(cookieName, next.replacement, cookieOptions);
      return json({ stage: next.stage });
    }
    if (action === "password") {
      if (!passwordValid(body.password))
        throw new AppError(
          "Use 12–128 characters with uppercase, lowercase and a number.",
        );
      const result = await withActor(async (db, actor) => {
        if (actor.stage !== "password")
          throw new AppError("A password change is not pending.", 403);
        // Persist intent before calling Auth so interruptions remain visible to administrators.
        await audit(
          db,
          actor.id,
          "account.password_change_requested",
          null,
          actor.id,
        );
        return {
          id: actor.id,
          version: actor.security_version,
          session: actor.session_hash,
        };
      }, false);
      const replacement = token();
      await withActor(async (db, actor) => {
        if (
          actor.stage !== "password" ||
          actor.security_version !== result.version ||
          actor.session_hash !== result.session
        )
          throw new AppError("Account security changed. Sign in again.", 401);
        const { error } = await authClient(true).auth.admin.updateUserById(
          result.id,
          { password: body.password },
        );
        if (error)
          throw new AppError(
            "Password could not be changed. Try a different password or contact your administrator.",
            503,
          );
        await db.query(
          "update plu_private.users set must_change_password=false,security_version=security_version+1 where id=$1",
          [actor.id],
        );
        await db.query("delete from plu_private.sessions where user_id=$1", [
          actor.id,
        ]);
        await db.query(
          "insert into plu_private.sessions(token_hash,user_id,stage,security_version,expires_at) values($1,$2,'complete',$3,now()+interval '8 hours')",
          [hash(replacement), actor.id, actor.security_version + 1],
        );
        await audit(db, actor.id, "account.password_changed", null, actor.id);
      }, false);
      jar.set(cookieName, replacement, cookieOptions);
      return json({ stage: "complete" });
    }
    throw new AppError("Unknown action.", 404);
  } catch (error) {
    return failure(error);
  }
}
