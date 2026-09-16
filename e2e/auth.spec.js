import { test, expect } from "@playwright/test";
import pg from "pg";
import { randomUUID } from "node:crypto";
test.describe("password / email OTP orchestration with local Auth double", () => {
  test.skip(
    process.env.TEST_AUTH_PROVIDER !== "1",
    "Requires the explicitly isolated test Auth provider.",
  );
  let db;
  test.beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
      throw new Error("Local database required");
    db = new pg.Client({ connectionString: url });
    await db.connect();
  });
  test.afterAll(async () => {
    await db?.end();
  });
  async function account(role = "registration", otp = true) {
    const id = randomUUID(),
      email = `${id}@test.invalid`;
    await db.query(
      "insert into plu_private.users(id,email,name,role,division,otp_enabled,is_test) values($1,$2,$3,$4,$5,$6,true)",
      [
        id,
        email,
        `TEST ${role}`,
        role,
        role === "registration" ? "Kampala Central" : null,
        otp,
      ],
    );
    return { id, email };
  }
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
  async function firstLogin(page, user, otp = true) {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("InitialPassword99");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    if (otp) {
      await expect(page.getByLabel("Email verification code")).toBeVisible();
      expect((await page.request.get("/api/records")).status()).toBe(401);
      await page.getByLabel("Email verification code").fill("123456");
      await page.getByRole("button", { name: "Verify email" }).click();
    }
    await expect(page.getByLabel("Set your permanent password")).toBeVisible();
    expect((await page.request.get("/api/records")).status()).toBe(401);
    await page
      .getByLabel("Set your permanent password")
      .fill("PermanentPassword99");
    await page
      .getByLabel("Confirm permanent password")
      .fill("PermanentPassword99");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL(/\/overview$/);
  }
  test("password and OTP are both mandatory; permanent password and logout rotate/revoke sessions", async ({
    page,
  }) => {
    const user = await account();
    await page.goto("/login");
    expect(
      (await post(page, "auth/login", { email: user.email, password: "wrong" }))
        .status,
    ).toBe(401);
    await firstLogin(page, user);
    await expect(
      page.getByRole("heading", {
        name: "Every young person. A place to begin.",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/records")).status()).toBe(401);
    expect(
      (
        await post(page, "auth/login", {
          email: user.email,
          password: "PermanentPassword99",
        })
      ).data.stage,
    ).toBe("otp");
    expect((await post(page, "auth/otp", { code: "000000" })).status).toBe(401);
    expect((await page.request.get("/api/records")).status()).toBe(401);
    expect((await post(page, "auth/otp", { code: "123456" })).data.stage).toBe(
      "complete",
    );
    expect((await post(page, "auth/otp", { code: "123456" })).status).toBe(401);
    await db.query("update plu_private.users set active=false where id=$1", [
      user.id,
    ]);
    expect((await page.request.get("/api/records")).status()).toBe(401);
  });
  test("OTP-off still requires initial password change; admin creates and resets accounts with audit", async ({
    page,
  }) => {
    const user = await account("admin-full", false);
    await firstLogin(page, user, false);
    const email = `${randomUUID()}@test.invalid`;
    expect(
      (
        await post(page, "users", {
          action: "create",
          email,
          name: "TEST created account",
          role: "approval",
          division: null,
          password: "TemporaryPassword99",
          emailChecked: true,
        })
      ).status,
    ).toBe(200);
    let target = (await (await page.request.get("/api/users")).json()).find(
      (u) => u.email === email,
    );
    expect(target.otp_enabled).toBe(true);
    expect(target.must_change_password).toBe(true);
    expect(
      (
        await post(page, "users", {
          action: "reset-password",
          id: target.id,
          version: target.security_version,
          password: "ResetPassword99",
        })
      ).status,
    ).toBe(200);
    const history = await (
      await page.request.get(
        "/api/audit?action=account.password_reset_triggered",
      )
    ).json();
    expect(
      history.events.some(
        (e) => e.actor_id === user.id && e.target_user_id === target.id,
      ),
    ).toBe(true);
    expect(JSON.stringify(history)).not.toContain("ResetPassword99");
    target = (await (await page.request.get("/api/users")).json()).find(
      (u) => u.id === target.id,
    );
    expect(
      (
        await post(page, "users", {
          action: "reset-password",
          id: target.id,
          version: target.security_version,
          password: "ProviderFailure99",
        })
      ).status,
    ).toBe(503);
    target = (await (await page.request.get("/api/users")).json()).find(
      (u) => u.id === target.id,
    );
    expect(target.active).toBe(false);
  });
});
