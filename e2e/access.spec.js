import { test, expect } from "@playwright/test";
import pg from "pg";
import { randomUUID, randomBytes, createHash } from "node:crypto";
const url = process.env.TEST_DATABASE_URL;
test.describe("isolated database / browser access checks", () => {
  test.skip(
    !url,
    "Set TEST_DATABASE_URL to an isolated local database; never seed browser fixtures into live data.",
  );
  let db;
  test.beforeAll(async () => {
    if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
      throw new Error("Local test database required.");
    db = new pg.Client({ connectionString: url });
    await db.connect();
  });
  test.afterAll(async () => {
    await db?.end();
  });
  async function staff(
    context,
    role = "registration",
    division = "Kampala Central",
    stage = "complete",
  ) {
    const id = randomUUID(),
      raw = randomBytes(32).toString("base64url"),
      hash = createHash("sha256").update(raw).digest("hex");
    await db.query(
      "insert into plu_private.users(id,email,name,role,division,must_change_password,is_test) values($1,$2,$3,$4,$5,false,true)",
      [
        id,
        `${id}@test.invalid`,
        `TEST ${role}`,
        role,
        role === "registration" ? division : null,
      ],
    );
    await db.query(
      "insert into plu_private.sessions(token_hash,user_id,stage,security_version,expires_at) values($1,$2,$3,1,now()+interval '1 hour')",
      [hash, id, stage],
    );
    await context.addCookies([
      {
        name:
          process.env.PLAYWRIGHT_PRODUCTION === "1"
            ? "__Host-plu-session"
            : "plu-session",
        value: raw,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: process.env.PLAYWRIGHT_PRODUCTION === "1",
        sameSite: "Strict",
      },
    ]);
    return id;
  }
  const values = {
    name: "Browser Registrant",
    nin: "CM123456789012",
    phone: "0700000000",
    dob: "2000-01-01",
    education: "primary",
    district: "Kampala Central",
    subcounty: "Test parish",
    skills: [],
    guardianName: "",
    guardianPhone: "",
    consent: false,
  };
  async function post(page, path, body) {
    return page.evaluate(
      async ({ path, body }) => {
        const r = await fetch(`/api/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return { status: r.status, data: await r.json() };
      },
      { path, body },
    );
  }
  test("anonymous, public-route and incomplete-session bypasses fail", async ({
    page,
    context,
  }) => {
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      (await post(page, "auth/login", { email: "", password: "" })).status,
    ).toBe(400);
    for (const path of ["/register", "/status"])
      expect((await page.goto(path)).status()).toBe(404);
    await staff(context, "admin-full", null, "otp");
    expect((await page.request.get("/api/records")).status()).toBe(401);
    expect((await page.request.get("/api/users")).status()).toBe(401);
    expect(
      (
        await page.request.post("/api/records", {
          data: { action: "save" },
          headers: { Origin: "https://attacker.invalid" },
        })
      ).status(),
    ).toBe(403);
  });
  test("registration correction, resubmission, review, masking and terminal locks", async ({
    page,
    context,
    browser,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const owner = await staff(context);
    await page.goto("/staff-entry");
    await page.getByLabel("Full name", { exact: true }).fill(values.name);
    await page.getByLabel("Phone number", { exact: true }).fill(values.phone);
    await page
      .getByLabel("National Identification Number (NIN)", { exact: true })
      .fill(values.nin);
    await page.getByLabel("Date of birth", { exact: true }).fill(values.dob);
    await page
      .getByLabel("Locality / parish", { exact: true })
      .fill(values.subcounty);
    await page
      .getByLabel("Education level", { exact: true })
      .selectOption(values.education);
    await expect(page.getByLabel("Division", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Submit registration" }).click();
    await expect(
      page.getByRole("heading", { name: "Registration submitted." }),
    ).toBeVisible();
    let list = await (await page.request.get("/api/records")).json();
    let r = list.find((r) => r.owner_id === owner);
    expect(r).toBeTruthy();
    expect(JSON.stringify(list)).not.toContain(values.nin);
    const approvalContext = await browser.newContext();
    await staff(approvalContext, "approval");
    const approvalPage = await approvalContext.newPage();
    await approvalPage.goto("/registrations");
    expect(
      (
        await post(approvalPage, "records", {
          action: "save",
          id: r.id,
          version: r.version,
          values,
          status: "submitted",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(approvalPage, "records", {
          action: "review",
          id: r.id,
          version: r.version,
          status: "needs_correction",
          reason: "Correct parish",
        })
      ).status,
    ).toBe(200);
    await page.goto(`/edit/${r.id}`);
    await page
      .getByLabel("Locality / parish", { exact: true })
      .fill("Corrected parish");
    await page.getByRole("button", { name: "Resubmit for review" }).click();
    await expect(
      page.getByRole("heading", { name: "Registration submitted." }),
    ).toBeVisible();
    r = (await (await page.request.get("/api/records")).json()).find(
      (x) => x.id === r.id,
    );
    expect(
      (
        await post(approvalPage, "records", {
          action: "review",
          id: r.id,
          version: r.version,
          status: "approved",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await post(page, "records", {
          action: "save",
          id: r.id,
          version: r.version + 1,
          values,
          status: "approved",
        })
      ).status,
    ).toBe(403);
    expect((await page.goto(`/edit/${r.id}`)).status()).toBe(404);
    const otherContext = await browser.newContext();
    await staff(otherContext, "registration", "Kawempe");
    expect(
      (await (await otherContext.request.get("/api/records")).json()).some(
        (x) => x.id === r.id,
      ),
    ).toBe(false);
    await otherContext.close();
    const readContext = await browser.newContext();
    await staff(readContext, "admin-readonly");
    const readPage = await readContext.newPage();
    await readPage.goto("/registrations");
    for (const action of ["unmask", "review", "save"])
      expect(
        (
          await post(readPage, "records", {
            action,
            id: r.id,
            values,
            status: "rejected",
            version: r.version + 1,
          })
        ).status,
      ).toBe(403);
    expect((await readContext.request.get("/api/audit")).status()).toBe(403);
    await readPage.goto("/districts");
    await expect(
      readPage.getByRole("heading", {
        name: "Participation across divisions.",
      }),
    ).toBeVisible();
    const adminContext = await browser.newContext();
    await staff(adminContext, "admin-full");
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/audit");
    expect(
      (await post(adminPage, "records", { action: "unmask", id: r.id })).data
        .nin,
    ).toBe(values.nin);
    const audit = await (
      await adminContext.request.get(`/api/audit?record=${r.id}`)
    ).json();
    expect(audit.events.some((e) => e.action === "record.nin_unmasked")).toBe(
      true,
    );
    expect(JSON.stringify(audit)).not.toContain(values.nin);
    const filteredAudit = await (
      await adminContext.request.get(
        `/api/audit?record=${r.id}&action=record.nin_unmasked`,
      )
    ).json();
    expect(filteredAudit.events.length).toBe(1);
    await adminPage.setViewportSize({ width: 375, height: 812 });
    await adminPage.goto("/audit");
    await expect(
      adminPage
        .locator("tbody tr")
        .filter({ hasText: "record.nin_unmasked" })
        .first(),
    ).toBeVisible();
    expect(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await adminPage.screenshot({
      path: "test-results/audit-mobile.png",
      fullPage: true,
    });
    await adminPage.goto("/users");
    expect(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/registrations");
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/register-mobile.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
    await approvalContext.close();
    await readContext.close();
    await adminContext.close();
  });
  test("admin toggles OTP for self and others; stale sessions are revoked", async ({
    page,
    context,
    browser,
  }) => {
    const admin = await staff(context, "admin-full");
    const other = await browser.newContext();
    const target = await staff(other, "approval");
    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: "User accounts", exact: true }),
    ).toBeVisible();
    expect(
      (
        await post(page, "users", {
          action: "otp",
          id: target,
          version: 1,
          enabled: false,
        })
      ).status,
    ).toBe(200);
    expect((await other.request.get("/api/records")).status()).toBe(401);
    expect(
      (
        await post(page, "users", {
          action: "otp",
          id: target,
          version: 2,
          enabled: true,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await post(page, "users", {
          action: "otp",
          id: admin,
          version: 1,
          enabled: false,
        })
      ).status,
    ).toBe(200);
    expect((await context.request.get("/api/records")).status()).toBe(401);
    await other.close();
  });
});
