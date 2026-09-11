import test from "node:test";
import assert from "node:assert/strict";
import {
  ageFromDOB,
  maskNIN,
  normalizePhone,
  validPhone,
  makeRecords,
  districts,
  statuses,
} from "../src/data.js";
test("age switches on the eighteenth birthday and rejects future dates", () => {
  assert.equal(ageFromDOB("2008-09-11", new Date(2026, 8, 10)), 17);
  assert.equal(ageFromDOB("2008-09-11", new Date(2026, 8, 11)), 18);
  assert.equal(ageFromDOB("2030-01-01", new Date(2026, 8, 11)), null);
  assert.equal(ageFromDOB(""), null);
});
test("phone lookup accepts local and international formatting", () => {
  assert.equal(
    normalizePhone("0700 000 000"),
    normalizePhone("+256 700 000 000"),
  );
  assert.ok(validPhone("+256700000000"));
  assert.ok(!validPhone("123"));
});
test("NIN masking only exposes the suffix", () =>
  assert.equal(maskNIN("DEMOONLY1234"), "•••• •••• 1234"));
test("mock register has unique references, all statuses, and consistent district coverage", () => {
  const records = makeRecords();
  assert.equal(new Set(records.map((r) => r.id)).size, records.length);
  assert.deepEqual(new Set(records.map((r) => r.status)), new Set(statuses));
  assert.deepEqual(new Set(records.map((r) => r.district)), new Set(districts));
});
