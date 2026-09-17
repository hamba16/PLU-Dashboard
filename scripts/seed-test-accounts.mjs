// Explicit SEED / TEST accounts only. Never run for real provisioning.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dbOptions } from "../utils/db-options.js";
const roles = ["admin-full", "registration", "approval", "admin-readonly"];
const entries = roles.map((role) => ({
  role,
  email: process.env[`SEED_${role.replaceAll("-", "_").toUpperCase()}_EMAIL`]
    ?.trim()
    .toLowerCase(),
}));
if (
  entries.some(
    (e) =>
      !e.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email) ||
      /@(example\.(com|org|net)|test\.invalid)$/.test(e.email),
  ) ||
  new Set(entries.map((e) => e.email)).size !== 4
)
  throw new Error(
    "Set four distinct, real, individually checked SEED_*_EMAIL inboxes in .env.local.",
  );
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
  credentials = JSON.parse(
    await readFile(".env.seed-credentials.json", "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error(
      "Existing seed credentials cannot be read; resolve before provisioning.",
    );
}
try {
  const existing = (
    await db.query(
      "select id,email,role,is_test from plu_private.users where not is_system_admin",
    )
  ).rows;
  if (
    existing.some(
      (u) =>
        !u.is_test ||
        !entries.some((e) => e.email === u.email && e.role === u.role),
    )
  )
    throw new Error(
      "Seed only a clean project or resume this exact four-account seed.",
    );
  const { data: authUsers, error: listError } = await auth.auth.admin.listUsers(
    { perPage: 1000 },
  );
  if (listError) throw new Error("Cannot inventory Auth accounts.");
  if (
    authUsers.users.some(
      (u) =>
        u.email !== "hambatariq84@gmail.com" &&
        !entries.some((e) => e.email === u.email),
    )
  )
    throw new Error(
      "Unexpected Auth accounts exist; reconcile before seeding.",
    );
  for (const entry of entries) {
    const old = existing.find((u) => u.email === entry.email);
    if (old) {
      if (
        !authUsers.users.some((u) => u.id === old.id && u.email === old.email)
      )
        throw new Error(
          "Seed profile has no matching Auth identity; reconcile before continuing.",
        );
      continue;
    }
    const orphan = authUsers.users.find((u) => u.email === entry.email);
    if (orphan)
      throw new Error(
        "An Auth account has no matching app profile; reconcile explicitly.",
      );
    const id = randomUUID(),
      password = `Test9aA-${randomBytes(18).toString("base64url")}`;
    const { error } = await auth.auth.admin.createUser({
      id,
      email: entry.email,
      password,
      email_confirm: true,
      app_metadata: { seed_test: true },
    });
    if (error)
      throw new Error(
        `Auth provisioning failed for ${entry.role}; no credentials printed.`,
      );
    await db.query("begin");
    try {
      await db.query(
        "insert into plu_private.users(id,email,name,role,division,is_test) values($1,$2,$3,$4,$5,true)",
        [
          id,
          entry.email,
          `SEED TEST — ${entry.role}`,
          entry.role,
          entry.role === "registration" ? "Kampala Central" : null,
        ],
      );
      const actor =
        entry.role === "admin-full"
          ? id
          : (
              await db.query(
                "select id from plu_private.users where role='admin-full' and is_test",
              )
            ).rows[0].id;
      await db.query(
        "insert into plu_private.audit_events(actor_id,action,target_user_id,detail) values($1,'seed.account_created',$2,$3)",
        [
          actor,
          id,
          {
            role: entry.role,
            division: entry.role === "registration" ? "Kampala Central" : null,
            bootstrap: entry.role === "admin-full",
          },
        ],
      );
      await db.query("commit");
    } catch (error) {
      await db.query("rollback");
      await auth.auth.admin.deleteUser(id);
      throw error;
    }
    credentials.push({ ...entry, password });
    await writeFile(
      ".env.seed-credentials.json",
      JSON.stringify(credentials, null, 2),
      { mode: 0o600 },
    );
  }
  const count = (
    await db.query("select count(*) from plu_private.users where is_test")
  ).rows[0].count;
  if (Number(count) !== 4)
    throw new Error("Seed did not produce exactly four test accounts.");
  console.log(
    "Exactly four test accounts verified. OTP ON; permanent password required. New credentials are in ignored .env.seed-credentials.json.",
  );
} finally {
  await db.end();
}
