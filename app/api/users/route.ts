import { randomUUID } from "node:crypto";
import { withActor, authClient } from "@/utils/auth";
import { audit, transaction } from "@/utils/db";
import { bodyOf, failure, json } from "@/utils/http";
import { AppError, requireRight, validAssignment } from "@/src/access";
import { passwordValid } from "@/src/validation";
export async function GET() {
  try {
    return json(
      await withActor(async (db, actor) => {
        requireRight(actor.role === "admin-full");
        return (
          await db.query(
            "select id,email,name,role,division,active,otp_enabled,must_change_password,is_test,is_system_admin,security_version from plu_private.users order by name,id",
          )
        ).rows;
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await bodyOf(request);
    const prepared = await withActor(
      async (db, actor) => {
        requireRight(actor.role === "admin-full");
        if (body.action === "create") {
          const email =
            typeof body.email === "string"
              ? body.email.trim().toLowerCase()
              : "";
          if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            email.length > 254 ||
            body.emailChecked !== true
          )
            throw new AppError(
              "Confirm an individually checked email address.",
            );
          if (
            !validAssignment(body.role, body.division) ||
            typeof body.name !== "string" ||
            !body.name.trim() ||
            body.name.length > 100
          )
            throw new AppError("Enter a name and valid role/division.");
          if (!passwordValid(body.password))
            throw new AppError(
              "Temporary password must have 12–128 characters, uppercase, lowercase and a number.",
            );
          const id = randomUUID();
          await db.query(
            "insert into plu_private.users(id,email,name,role,division,active) values($1,$2,$3,$4,$5,false)",
            [id, email, body.name.trim(), body.role, body.division],
          );
          await audit(db, actor.id, "account.create_requested", null, id, {
            role: body.role,
            division: body.division,
          });
          return { id, email, actor: actor.id, version: 1, action: "create" };
        }
        const target = (
          await db.query(
            "select * from plu_private.users where id=$1 for update",
            [body.id],
          )
        ).rows[0];
        if (!target) throw new AppError("Account not found.", 404);
        if (target.is_system_admin && target.id !== actor.id) {
          await audit(
            db,
            actor.id,
            "account.protection_blocked",
            null,
            target.id,
            {
              operation: body.action,
              reason:
                "Only the system administrator can manage the protected system account.",
            },
          );
          return {
            blocked: true as const,
            message:
              "This is the protected system administrator account. Only the system administrator can manage it.",
          };
        }
        if (body.version !== target.security_version)
          throw new AppError("Account changed. Reload before saving.", 409);
        if (body.action === "edit") {
          if (
            !validAssignment(body.role, body.division) ||
            typeof body.active !== "boolean" ||
            typeof body.name !== "string" ||
            !body.name.trim() ||
            body.name.length > 100
          )
            throw new AppError("Invalid account details.");
          if (
            target.role === "admin-full" &&
            target.active &&
            (body.role !== "admin-full" || !body.active)
          ) {
            const count = (
              await db.query(
                "select count(*) from plu_private.users where role='admin-full' and active",
              )
            ).rows[0].count;
            if (Number(count) <= 1)
              throw new AppError(
                "Keep at least one active full administrator.",
              );
          }
          await db.query(
            "update plu_private.users set name=$2,role=$3,division=$4,active=$5,security_version=security_version+1 where id=$1",
            [
              target.id,
              body.name.trim(),
              body.role,
              body.division,
              body.active,
            ],
          );
          await audit(db, actor.id, "account.updated", null, target.id, {
            from: {
              name: target.name,
              role: target.role,
              division: target.division,
              active: target.active,
            },
            to: {
              name: body.name.trim(),
              role: body.role,
              division: body.division,
              active: body.active,
            },
          });
          if (target.active !== body.active)
            await audit(
              db,
              actor.id,
              body.active ? "account.reactivated" : "account.deactivated",
              null,
              target.id,
            );
        } else if (body.action === "otp") {
          if (typeof body.enabled !== "boolean")
            throw new AppError("Invalid OTP setting.");
          await db.query(
            "update plu_private.users set otp_enabled=$2,security_version=security_version+1 where id=$1",
            [target.id, body.enabled],
          );
          await audit(db, actor.id, "account.otp_toggled", null, target.id, {
            from: target.otp_enabled,
            to: body.enabled,
          });
        } else if (body.action === "reset-password") {
          if (!passwordValid(body.password))
            throw new AppError(
              "Temporary password must have 12–128 characters, uppercase, lowercase and a number.",
            );
          await db.query(
            "update plu_private.users set active=false,must_change_password=true,security_version=security_version+1 where id=$1",
            [target.id],
          );
          await audit(
            db,
            actor.id,
            "account.password_reset_requested",
            null,
            target.id,
          );
        } else throw new AppError("Unknown action.");
        return {
          blocked: false as const,
          id: target.id,
          email: target.email,
          actor: actor.id,
          version: target.security_version + 1,
          action: body.action,
          wasActive: target.active,
        };
      },
      true,
      true,
    );
    if (prepared.blocked) throw new AppError(prepared.message, 403);
    if (prepared.action === "create" || prepared.action === "reset-password") {
      const failed = await transaction(async (db) => {
        await db.query("select pg_advisory_xact_lock(4102026)");
        const current = (
          await db.query(
            "select * from plu_private.users where id=$1 for update",
            [prepared.id],
          )
        ).rows[0];
        if (current.security_version !== prepared.version)
          throw new AppError(
            "Account changed during the security action. Reload and retry.",
            409,
          );
        const auth = authClient(true);
        const result =
          prepared.action === "create"
            ? await auth.auth.admin.createUser({
                id: prepared.id,
                email: prepared.email,
                password: body.password,
                email_confirm: true,
                app_metadata: { provisioned_by: "plu-admin" },
              })
            : await auth.auth.admin.updateUserById(prepared.id, {
                password: body.password,
                ban_duration: "none",
              });
        if (!result.error)
          await db.query("update plu_private.users set active=$2 where id=$1", [
            prepared.id,
            prepared.action === "create" || prepared.wasActive,
          ]);
        await audit(
          db,
          prepared.actor,
          result.error
            ? "account.security_action_failed"
            : prepared.action === "create"
              ? "account.created"
              : "account.password_reset_triggered",
          null,
          prepared.id,
          { operation: prepared.action },
        );
        return !!result.error;
      });
      if (failed)
        throw new AppError(
          "Auth could not complete the action. The account remains inactive. The attempt is in the audit log; retry the reset, then reactivate the account.",
          503,
        );
    }
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
