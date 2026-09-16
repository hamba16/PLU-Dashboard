import "server-only";
import pg, { type PoolClient } from "pg";
import { dbOptions } from "./db-options";
const globalDb = globalThis as unknown as { pluPool?: pg.Pool };
export function pool() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured.");
  return (globalDb.pluPool ??= new pg.Pool({
    ...dbOptions(),
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
  }));
}
export async function transaction<T>(
  fn: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await pool().connect();
  try {
    await db.query("begin");
    const result = await fn(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    db.release();
  }
}
export async function audit(
  db: PoolClient,
  actor: string | null,
  action: string,
  record: string | null,
  target: string | null,
  detail: object = {},
) {
  await db.query(
    "insert into plu_private.audit_events(actor_id, action, record_id, target_user_id, detail) values ($1,$2,$3,$4,$5)",
    [actor, action, record, target, JSON.stringify(detail)],
  );
}
