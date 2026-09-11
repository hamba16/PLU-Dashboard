import { test, expect } from "@playwright/test";

test("blank credentials enter after the welcome transition; refresh restores the gate", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enter workspace", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Opening your dashboard…");
  await expect(
    page.getByRole("heading", {
      name: "Every young person. A place to begin.",
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("arbitrary credentials work, password toggle works, and a staff deep link is preserved", async ({
  page,
}) => {
  await page.goto("/districts");
  await page
    .getByLabel("Email or username")
    .fill("anything without email syntax");
  await page.getByLabel("Password", { exact: true }).fill("any password !");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Hide password" }).click();
  await page.getByLabel("Password", { exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Participation across districts." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/districts$/);
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});
test("public screens remain accessible without login and explicit login routes to overview", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Go to public registration" }).click();
  await expect(
    page.getByRole("heading", { name: "Your participation starts here." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Check status", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "A little clarity. Every step of the way.",
    }),
  ).toBeVisible();
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Enter workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(
    page.getByRole("heading", {
      name: "Every young person. A place to begin.",
    }),
  ).toBeVisible();
});
test("login is usable at mobile width with reduced motion and keyboard entry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "extra/doc/preview/login-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Email or username").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Every young person. A place to begin.",
    }),
  ).toBeVisible();
});
