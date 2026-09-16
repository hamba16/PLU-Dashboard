import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { dbOptions } from "../utils/db-options.js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Supabase public configuration missing.");
const response = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Auth settings: HTTP ${response.status}`);
const settings = await response.json();
if (settings.disable_signup !== true)
  throw new Error("Public signup is not disabled.");
console.log("Live Supabase Auth reachable; public signup disabled.");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const probe = await client
  .schema("plu_private")
  .from("registrants")
  .select("id")
  .limit(1);
if (!probe.error)
  throw new Error("Private schema unexpectedly accessible via Data API.");
console.log(`Private Data API access denied (${probe.error.code}).`);
const db = new pg.Client(dbOptions());
try {
  await db.connect();
  const { rows } = await db.query(
    "select current_user, (select count(*)::int from plu_private.registrants) registrants,(select count(*)::int from plu_private.users) app_accounts,(select count(*)::int from plu_private.users where is_test) seed_accounts",
  );
  console.log(rows[0]);
  const denied = await db.query(
    "select has_table_privilege(current_user,'plu_private.audit_events','DELETE') can_delete_audit,has_table_privilege(current_user,'plu_private.audit_events','UPDATE') can_update_audit",
  );
  if (denied.rows[0].can_delete_audit || denied.rows[0].can_update_audit)
    throw new Error("Server role can mutate history.");
  console.log(
    "Dedicated server database login verified with CA and hostname checks; audit rewrite rights denied.",
  );
} finally {
  await db.end();
}
