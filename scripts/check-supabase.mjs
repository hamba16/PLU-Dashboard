import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error("Supabase environment variables are missing.");
const options = {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
};
const auth = await fetch(`${url}/auth/v1/settings`, options);
if (!auth.ok)
  throw new Error(`Supabase Auth connectivity failed: HTTP ${auth.status}`);
console.log(`Supabase Auth: HTTP ${auth.status}; publishable key accepted.`);
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// The supplied setup example references todos. Probe it without retrieving rows;
// do not create a template table or assume it is the app's registration schema.
const probe = await client.from("todos").select("id", { head: true }).limit(0);
if (probe.error && probe.error.code !== "PGRST205") {
  throw new Error(
    `Data API probe: ${probe.error.code}: ${probe.error.message}`,
  );
}
console.log(
  probe.error
    ? "Supabase Data API reached via SDK; example todos table is not exposed (PGRST205)."
    : `Supabase Data API reached via SDK: HTTP ${probe.status}; no row data read.`,
);
const { data, error } = await client.auth.getClaims();
if (error && error.name !== "AuthSessionMissingError") throw error;
console.log(
  `Supabase SDK initialized; anonymous session: ${data === null ? "confirmed" : "checked"}. No database writes performed.`,
);
