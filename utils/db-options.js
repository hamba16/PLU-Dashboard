import { readFileSync } from "node:fs";
import { join } from "node:path";
export function dbOptions(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const url = new URL(connectionString);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ca: readFileSync(
            join(process.cwd(), "supabase", "certs", "prod-ca-2021.crt"),
            "utf8",
          ),
        },
  };
}
