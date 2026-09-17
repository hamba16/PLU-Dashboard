import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { PoolClient } from "pg";
import { transaction } from "./db";
import { hash } from "./crypto";
import { AppError } from "@/src/access";
export const cookieName =
  process.env.NODE_ENV === "production" ? "__Host-plu-session" : "plu-session";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 8 * 60 * 60,
};
export function authClient(admin = false) {
  const key = admin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error("Supabase server credentials are not configured.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export type Actor = {
  id: string;
  email: string;
  name: string;
  role: string;
  division: string | null;
  active: boolean;
  otp_enabled: boolean;
  must_change_password: boolean;
  security_version: number;
  is_test: boolean;
  is_system_admin: boolean;
  stage: string;
  session_hash: string;
  attempts: number;
};
export async function actorIn(
  db: PoolClient,
  rawToken: string,
  complete = true,
): Promise<Actor> {
  // Live profile checks revoke access immediately after any account-security change.
  const { rows } = await db.query(
    `select u.*, s.stage, s.token_hash session_hash, s.attempts from plu_private.users u
    join plu_private.sessions s on s.user_id=u.id and s.security_version=u.security_version
    where s.token_hash=$1 and s.expires_at>now() and u.active for update of s, u`,
    [hash(rawToken)],
  );
  const actor = rows[0];
  if (
    !actor ||
    (complete && (actor.stage !== "complete" || actor.must_change_password))
  )
    throw new AppError("Please sign in to continue.", 401);
  return actor;
}
export async function withActor<T>(
  fn: (db: PoolClient, actor: Actor) => Promise<T>,
  complete = true,
  accountLock = false,
) {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw) throw new AppError("Please sign in to continue.", 401);
  return transaction(async (db) => {
    if (accountLock) await db.query("select pg_advisory_xact_lock(4102026)");
    return fn(db, await actorIn(db, raw, complete));
  });
}
export function publicActor(a: Actor) {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    division: a.division,
    is_test: a.is_test,
    is_system_admin: a.is_system_admin,
  };
}
