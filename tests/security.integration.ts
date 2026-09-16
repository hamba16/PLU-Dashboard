import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { saveRecord, reviewRecord, listRecords } from "../utils/records";
import { actorIn } from "../utils/auth";
import { hash, encryptNin, decryptNin } from "../utils/crypto";
import { emptyForm } from "../src/data.js";
const url = process.env.TEST_DATABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error(
    "TEST_DATABASE_URL must point to an isolated local database.",
  );
process.env.NIN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const db = new pg.Client({ connectionString: url });
test("database-enforced privacy, real record transactions and session revocation", async () => {
  await db.connect();
  await db.query("begin");
  try {
    const actors: any = {};
    for (const [role, division] of [
      ["registration", "Kampala Central"],
      ["approval", null],
      ["admin-readonly", null],
      ["admin-full", null],
      ["other", "Kawempe"],
    ]) {
      const id = randomUUID();
      const result = await db.query(
        "insert into plu_private.users(id,email,name,role,division,must_change_password) values($1,$2,$3,$4,$5,false) returning *",
        [
          id,
          `${id}@test.invalid`,
          role,
          role === "other" ? "registration" : role,
          division,
        ],
      );
      actors[role] = result.rows[0];
    }
    await db.query("set local role plu_app");
    async function denied(fn: () => Promise<unknown>, status = 403) {
      await db.query("savepoint denial");
      try {
        await assert.rejects(fn, (e: any) => e.status === status);
      } finally {
        await db.query("rollback to savepoint denial");
      }
    }
    const fields = {
      ...emptyForm(),
      district: "Kampala Central",
      name: "Integration Person",
      phone: "0700000000",
      dob: "2000-01-01",
      education: "primary",
      subcounty: "Locality",
      nin: "CM123456789012",
    };
    const registration = actors.registration;
    let record = await saveRecord(db as any, registration, {
      values: fields,
      status: "submitted",
    });
    assert.equal(record.nin, "");
    assert.equal(record.ninMasked, "•••• •••• 9012");
    await denied(() =>
      saveRecord(db as any, actors.approval, {
        values: fields,
        status: "draft",
      }),
    );
    await denied(() =>
      saveRecord(db as any, actors["admin-readonly"], {
        id: record.id,
        version: record.version,
        values: fields,
        status: "submitted",
      }),
    );
    await denied(() =>
      saveRecord(db as any, actors.other, {
        id: record.id,
        version: record.version,
        values: fields,
        status: "submitted",
      }),
    );
    await denied(
      () =>
        saveRecord(db as any, registration, {
          id: record.id,
          version: 999,
          values: fields,
          status: "submitted",
        }),
      409,
    );
    await denied(() =>
      reviewRecord(db as any, registration, {
        id: record.id,
        version: record.version,
        status: "approved",
      }),
    );
    await denied(
      () =>
        reviewRecord(db as any, actors.approval, {
          id: record.id,
          version: record.version,
          status: "needs_correction",
        }),
      400,
    );
    await reviewRecord(db as any, actors.approval, {
      id: record.id,
      version: record.version,
      status: "needs_correction",
      reason: "Correct locality",
    });
    record = (await listRecords(db as any, registration))[0];
    assert.equal(record.status, "needs_correction");
    record = await saveRecord(db as any, registration, {
      id: record.id,
      version: record.version,
      status: "submitted",
      values: { ...fields, nin: "", subcounty: "Corrected" },
    });
    await reviewRecord(db as any, actors.approval, {
      id: record.id,
      version: record.version,
      status: "approved",
    });
    record = (await listRecords(db as any, registration))[0];
    await denied(() =>
      saveRecord(db as any, registration, {
        id: record.id,
        version: record.version,
        status: "approved",
        values: fields,
      }),
    );
    assert.equal((await listRecords(db as any, actors.other)).length, 0);
    assert.ok(
      (await listRecords(db as any, actors["admin-readonly"])).some(
        (r) => r.id === record.id,
      ),
    );
    let rejected = await saveRecord(db as any, registration, {
      values: fields,
      status: "submitted",
    });
    await reviewRecord(db as any, actors.approval, {
      id: rejected.id,
      version: rejected.version,
      status: "rejected",
      reason: "Duplicate",
    });
    rejected = (await listRecords(db as any, registration)).find(
      (r) => r.id === rejected.id,
    )!;
    for (const actor of [registration, actors["admin-full"]])
      await denied(() =>
        saveRecord(db as any, actor, {
          id: rejected.id,
          version: rejected.version,
          status: "rejected",
          values: fields,
        }),
      );
    const events = (
      await db.query("select * from plu_private.audit_events order by id")
    ).rows;
    assert.ok(
      events.some(
        (a) =>
          a.action === "record.fields_edited" &&
          a.detail.changes.subcounty.from === "Locality",
      ),
    );
    assert.ok(!JSON.stringify(events).includes(fields.nin));
    assert.equal(
      events.filter(
        (a) =>
          a.action === "record.status_changed" && a.record_id === record.id,
      ).length,
      4,
    );
    const stored = (
      await db.query(
        "select nin_ciphertext from plu_private.registrants where id=$1",
        [record.id],
      )
    ).rows[0].nin_ciphertext;
    assert.ok(!stored.includes(fields.nin));
    assert.equal(decryptNin(stored, record.id), fields.nin);
    assert.throws(() => decryptNin(stored, randomUUID()));
    const session = randomBytes(32).toString("base64url");
    await db.query(
      "insert into plu_private.sessions(token_hash,user_id,stage,security_version,expires_at) values($1,$2,'otp',1,now()+interval '10 minutes')",
      [hash(session), registration.id],
    );
    await denied(() => actorIn(db as any, session), 401);
    await db.query(
      "update plu_private.sessions set stage='complete' where token_hash=$1",
      [hash(session)],
    );
    assert.equal((await actorIn(db as any, session)).id, registration.id);
    await db.query(
      "update plu_private.users set security_version=security_version+1 where id=$1",
      [registration.id],
    );
    await denied(() => actorIn(db as any, session), 401);
    await db.query("savepoint audit_guard");
    await assert.rejects(
      () => db.query("delete from plu_private.audit_events"),
      (e: any) => e.code === "42501",
    );
    await db.query("rollback to savepoint audit_guard");
    await db.query("reset role");
    for (const role of ["anon", "authenticated"]) {
      await db.query("savepoint api_guard");
      await db.query(`set local role ${role}`);
      await assert.rejects(
        () => db.query("select * from plu_private.registrants"),
        (e: any) => e.code === "42501",
      );
      await db.query("rollback to savepoint api_guard");
    }
    await db.query("savepoint immutable");
    await assert.rejects(
      () => db.query("update plu_private.audit_events set action=action"),
      /append-only/,
    );
    await db.query("rollback to savepoint immutable");
  } finally {
    await db.query("rollback");
    await db.end();
  }
});
