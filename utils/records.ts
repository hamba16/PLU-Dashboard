import "server-only";
import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { audit } from "./db";
import type { Actor } from "./auth";
import {
  AppError,
  canCreate,
  canEdit,
  canReview,
  canView,
  requireRight,
} from "@/src/access";
import { validateFields, fieldChanges } from "@/src/validation";
import { encryptNin } from "./crypto";
export const safeRecord = (r: any) => ({
  ...r.fields,
  id: r.id,
  owner_id: r.owner_id,
  division: r.division,
  district: r.division,
  status: r.status,
  version: r.version,
  created: r.created_at.toISOString(),
  nin: "",
  ninMasked: r.nin_suffix ? `•••• •••• ${r.nin_suffix}` : "Not provided",
  hasNin: !!r.nin_suffix,
  source: "Staff entry",
  timeline: r.timeline || [],
});
export async function listRecords(db: PoolClient, actor: Actor) {
  const { rows } = await db.query(
    `select r.id,r.owner_id,r.division,r.fields,r.nin_suffix,r.status,r.version,r.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('status', a.detail->>'to','date',a.created_at,'note',a.detail->>'reason','actor',u.name) order by a.id)
      from plu_private.audit_events a left join plu_private.users u on u.id=a.actor_id where a.record_id=r.id and a.action='record.status_changed'),'[]'::jsonb) timeline
    from plu_private.registrants r where ($1::text is null or r.division=$1) order by r.created_at desc`,
    [actor.role === "registration" ? actor.division : null],
  );
  return rows.map(safeRecord);
}
export async function saveRecord(db: PoolClient, actor: Actor, body: any) {
  const id = body.id || randomUUID();
  let old: any;
  if (body.id) {
    old = (
      await db.query(
        "select * from plu_private.registrants where id=$1 for update",
        [id],
      )
    ).rows[0];
    requireRight(old && canEdit(actor, old));
    if (old.version !== body.version)
      throw new AppError("This record changed. Reload before saving.", 409);
  } else requireRight(canCreate(actor));
  const status = body.status;
  requireRight(
    ["draft", "submitted", "needs_correction", "approved"].includes(status),
  );
  if (!old) requireRight(["draft", "submitted"].includes(status));
  if (old)
    requireRight(
      status === old.status ||
        (["draft", "needs_correction"].includes(old.status) &&
          status === "submitted"),
    );
  const { fields, nin, division } = validateFields(
    body.values,
    status,
    !!old?.nin_ciphertext,
  );
  requireRight(actor.role !== "registration" || division === actor.division);
  requireRight(
    !old || division === old.division,
    "A record cannot be moved between divisions.",
  );
  const ciphertext = nin ? encryptNin(nin, id) : old?.nin_ciphertext || null;
  const suffix = nin ? nin.slice(-4) : old?.nin_suffix || null;
  const result = old
    ? await db.query(
        `update plu_private.registrants set fields=$2,nin_ciphertext=$3,nin_suffix=$4,status=$5,version=version+1,updated_at=now() where id=$1 returning *`,
        [id, fields, ciphertext, suffix, status],
      )
    : await db.query(
        `insert into plu_private.registrants(id,owner_id,division,fields,nin_ciphertext,nin_suffix,status) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [id, actor.id, division, fields, ciphertext, suffix, status],
      );
  const changes = fieldChanges(old?.fields || {}, fields, !!nin);
  if (Object.keys(changes).length)
    await audit(
      db,
      actor.id,
      old ? "record.fields_edited" : "record.created",
      id,
      null,
      { changes },
    );
  if (!old || old.status !== status)
    await audit(db, actor.id, "record.status_changed", id, null, {
      from: old?.status || null,
      to: status,
      reason: null,
    });
  return safeRecord(result.rows[0]);
}
export async function reviewRecord(db: PoolClient, actor: Actor, body: any) {
  const row = (
    await db.query(
      "select * from plu_private.registrants where id=$1 for update",
      [body.id],
    )
  ).rows[0];
  requireRight(row && canView(actor, row) && canReview(actor, row));
  if (row.version !== body.version)
    throw new AppError("This record changed. Reload before reviewing.", 409);
  requireRight(
    ["approved", "rejected", "needs_correction"].includes(body.status),
  );
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length > 2000 || (body.status !== "approved" && !reason))
    throw new AppError("A reason is required (maximum 2,000 characters).");
  await db.query(
    "update plu_private.registrants set status=$2,version=version+1,updated_at=now() where id=$1",
    [row.id, body.status],
  );
  await audit(db, actor.id, "record.status_changed", row.id, null, {
    from: row.status,
    to: body.status,
    reason: reason || null,
  });
  return { ok: true };
}
