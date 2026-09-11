import { test, expect } from "@playwright/test";

test("SSR routes, legacy links, 404 and Supabase health work", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const response = await page.goto("/register");
  expect(response.status()).toBe(200);
  await expect(page.getByLabel("Full name", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your participation starts here." }),
  ).toBeVisible();
  await page.goto("/#/status");
  await expect(page).toHaveURL(/\/status$/);
  await expect(page.getByLabel("Registration reference")).toBeVisible();
  const health = await request.get("/api/supabase/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ connected: true });
  expect(health.headers()["cache-control"]).toContain("no-store");
  expect(errors).toEqual([]);
  const missing = await request.get("/not-a-real-page");
  expect(missing.status()).toBe(404);
});
