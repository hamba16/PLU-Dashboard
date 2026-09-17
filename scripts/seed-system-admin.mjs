// Provisions the permanent platform-builder account. Never part of test seeding.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dbOptions } from "../utils/db-options.js";

const email = "hambatariq84@gmail.com";
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.DATABASE_URL)
  throw new Error("Configure server credentials first.");
const db = new pg.Client(dbOptions());
await db.connect();
const auth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let credentials = [];
try {
  try {
    credentials = JSON.parse(
      await readFile(".env.system-admin-credentials.json", "utf8"),
    );
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error("System administrator credentials cannot be read.");
  }
  const existing = (
    await db.query(
      "select id,email,role,is_test,is_system_admin from plu_private.users where email=$1",
      [email],
    )
  ).rows[0];
  if (existing) {
    if (
      existing.role !== "admin-full" ||
      existing.is_test ||
      !existing.is_system_admin
    )
      throw new Error("Existing system administrator profile is inconsistent.");
    console.log("Permanent system administrator account already verified.");
    return;
  }
  const { data: authUsers, error: listError } =
    await auth.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error("Cannot inventory Auth accounts.");
  if (authUsers.users.some((u) => u.email === email))
    throw new Error("Auth account exists without a matching app profile.");
  const id = randomUUID();
  const password = `System9aA-${randomBytes(18).toString("base64url")}`;
  const { error } = await auth.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
    app_metadata: { provisioned_by: "system-bootstrap", system_admin: true },
  });
  if (error) throw new Error("Auth provisioning failed; no credentials printed.");
  await db.query("begin");
  try {
    await db.query(
      "insert into plu_private.users(id,email,name,role,active,otp_enabled,must_change_password,is_system_admin,is_test) values($1,$2,$3,'admin-full',true,true,true,true,false)",
      [id, email, "System Administrator"],
    );
    await db.query(
      "insert into plu_private.audit_events(actor_id,action,target_user_id,detail) values($1,'seed.system_admin_created',$1,$2)",
      [id, { role: "admin-full", is_system_admin: true, permanent: true }],
    );
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    await auth.auth.admin.deleteUser(id);
    throw error;
  }
  credentials = [{ email, password }];
  await writeFile(
    ".env.system-admin-credentials.json",
    JSON.stringify(credentials, null, 2),
    { mode: 0o600 },
  );
  console.log(
    "Permanent system administrator provisioned. OTP ON; permanent password required. Credentials are in ignored .env.system-admin-credentials.json.",
  );
} finally {
  await db.end();
}
