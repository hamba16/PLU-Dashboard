import test from "node:test";
import assert from "node:assert/strict";
import {
  ageFromDOB,
  maskNIN,
  normalizePhone,
  validPhone,
  emptyForm,
} from "../src/data.js";
import {
  roles,
  divisions,
  canCreate,
  canView,
  canEdit,
  canReview,
  validAssignment,
} from "../src/access.js";
import {
  validateFields,
  fieldChanges,
  passwordValid,
} from "../src/validation.js";
test("age and Ugandan phones", () => {
  assert.equal(ageFromDOB("2008-09-11", new Date(2026, 8, 10)), 17);
  assert.equal(ageFromDOB("2008-09-11", new Date(2026, 8, 11)), 18);
  assert.equal(ageFromDOB("2030-01-01", new Date(2026, 8, 11)), null);
  assert.equal(
    normalizePhone("0700 000 000"),
    normalizePhone("+256 700 000 000"),
  );
  assert.ok(validPhone("+256700000000"));
  assert.ok(!validPhone("123"));
  assert.equal(maskNIN("CM123456789012"), "•••• •••• 9012");
});
test("complete role/status/ownership/division matrix", () => {
  for (const role of roles)
    for (const status of [
      "draft",
      "submitted",
      "needs_correction",
      "approved",
      "rejected",
    ])
      for (const own of [true, false])
        for (const same of [true, false]) {
          const actor = { id: "owner", role, division: divisions[0] },
            record = {
              owner_id: own ? "owner" : "other",
              division: divisions[same ? 0 : 1],
              status,
            };
          assert.equal(canView(actor, record), role !== "registration" || same);
          assert.equal(
            canCreate(actor),
            ["registration", "admin-full"].includes(role),
          );
          assert.equal(
            canEdit(actor, record),
            status !== "rejected" &&
              (role === "admin-full" ||
                (role === "registration" &&
                  own &&
                  same &&
                  ["draft", "submitted", "needs_correction"].includes(status))),
          );
          assert.equal(
            canReview(actor, record),
            ["approval", "admin-full"].includes(role) && status === "submitted",
          );
        }
});
test("assignment is a single role and fixed registration division", () => {
  for (const role of roles) {
    assert.equal(validAssignment(role, null), role !== "registration");
    for (const division of divisions)
      assert.equal(validAssignment(role, division), role === "registration");
  }
  assert.equal(validAssignment("admin", null), false);
  assert.equal(validAssignment("registration", "Wakiso"), false);
});
const values = {
  ...emptyForm(),
  name: "Test Person",
  phone: "0700000000",
  dob: "2000-01-01",
  nin: "CM123456789012",
  education: "primary",
  district: divisions[0],
  subcounty: "Parish",
};
test("server validates submission, guardians, real dates and input allowlist", () => {
  const result = validateFields(
    { ...values, role: "admin-full", owner_id: "attacker" },
    "submitted",
  );
  assert.ok(!("nin" in result.fields));
  assert.ok(!("role" in result.fields));
  assert.ok(!("owner_id" in result.fields));
  for (const update of [
    { nin: "123" },
    { dob: "2026-02-30" },
    { district: "Wakiso" },
    { phone: "123" },
    { education: "fake" },
    { skills: ["fake"] },
    { consent: "true" },
    { name: "" },
  ])
    assert.throws(() => validateFields({ ...values, ...update }, "submitted"));
  assert.throws(() =>
    validateFields({ ...values, dob: "2015-01-01" }, "submitted"),
  );
  assert.doesNotThrow(() =>
    validateFields(
      {
        ...values,
        dob: "2015-01-01",
        guardianName: "Guardian",
        guardianPhone: "0700000001",
        consent: true,
      },
      "submitted",
    ),
  );
  assert.doesNotThrow(() =>
    validateFields({ ...emptyForm(), district: divisions[0] }, "draft"),
  );
  assert.doesNotThrow(() =>
    validateFields({ ...values, nin: "" }, "submitted", true),
  );
});
test("audit NIN changes contain no raw values and password policy applies", () => {
  assert.deepEqual(fieldChanges({ name: "Old" }, { name: "New" }, true), {
    name: { from: "Old", to: "New" },
    nin: { changed: true },
  });
  assert.equal(passwordValid("short"), false);
  assert.equal(passwordValid("LongPassword99"), true);
});
