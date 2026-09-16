import { withActor } from "@/utils/auth";
import { requireRight, AppError } from "@/src/access";
import { failure, json } from "@/utils/http";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return json(
      await withActor(async (db, actor) => {
        requireRight(actor.role === "admin-full");
        const clauses: string[] = [],
          values: unknown[] = [];
        for (const [key, column] of [
          ["user", "a.actor_id"],
          ["record", "a.record_id"],
          ["action", "a.action"],
        ]) {
          const value = params.get(key);
          if (value) {
            values.push(value);
            clauses.push(`${column}=$${values.length}`);
          }
        }
        for (const [key, op] of [
          ["from", ">="],
          ["to", "<"],
        ]) {
          const value = params.get(key);
          if (value) {
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
              Number.isNaN(Date.parse(value))
            )
              throw new AppError("Invalid date filter.");
            values.push(value);
            clauses.push(
              `a.created_at ${op} $${values.length}::date${key === "to" ? " + interval '1 day'" : ""}`,
            );
          }
        }
        const page = Math.max(
          0,
          Math.min(100000, Number(params.get("page")) || 0),
        );
        if (!Number.isInteger(page)) throw new AppError("Invalid page.");
        values.push(page * 100);
        const { rows } = await db.query(
          `select a.*,u.email actor_email,u.name actor_name from plu_private.audit_events a left join plu_private.users u on u.id=a.actor_id
        ${clauses.length ? "where " + clauses.join(" and ") : ""} order by a.created_at desc,a.id desc limit 101 offset $${values.length}`,
          values,
        );
        return { events: rows.slice(0, 100), hasMore: rows.length > 100, page };
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
