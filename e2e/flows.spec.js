import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Enter workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Every young person. A place to begin.",
    }),
  ).toBeVisible();
});
test("registration, minor consent, review, public lookup and rollup share session state", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("heading", {
      name: "Every young person. A place to begin.",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Self-service registration", exact: true })
    .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Demo Test Registrant");
  await page.getByLabel("Phone number", { exact: true }).fill("0700000888");
  await page.getByLabel("National Identification Number").fill("DEMOONLY5678");
  await page.getByLabel("Date of birth").fill("2010-04-12");
  await expect(
    page.getByRole("heading", { name: "Guardian details" }),
  ).toBeVisible();
  await expect(page.getByLabel("National Identification Number")).toHaveValue(
    "•••• •••• 5678",
  );
  await page.getByLabel("Guardian name", { exact: true }).fill("Demo Guardian");
  await page.getByLabel("Guardian phone", { exact: true }).fill("0700000999");
  await page.getByText("The guardian has given consent").check();
  await page.getByLabel("District", { exact: true }).selectOption("Kampala");
  await page.getByLabel("Subcounty", { exact: true }).fill("Demo locality");
  await page
    .getByLabel("Education level", { exact: true })
    .selectOption("O-level");
  await page.getByLabel("ICT", { exact: true }).check();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re on the register." }),
  ).toBeVisible();
  const reference = await page.locator(".reference strong").innerText();
  await page.getByRole("link", { name: "Staff workspace" }).click();
  await page
    .getByRole("link", { name: "Registrations", exact: false })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Search registrations" })
    .fill(reference);
  await page
    .getByRole("button", { name: new RegExp("DT Demo Test Registrant") })
    .click();
  await page
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  await page
    .getByLabel("Details to correct")
    .fill("Please confirm your locality.");
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(page.locator(".record-detail")).toContainText(
    "Please confirm your locality.",
  );
  await page
    .getByRole("link", { name: "Check registration status", exact: true })
    .click();
  await page.getByLabel("Phone number").fill("+256700000888");
  await page.getByLabel("Registration reference").fill(reference);
  await page.getByRole("button", { name: "Check registration status" }).click();
  await expect(page.locator(".status-result")).toContainText(
    "Please confirm your locality.",
  );
  await expect(page.locator("main")).not.toContainText("5678");
  await expect(page.locator("main")).not.toContainText("NIN");
  await page.getByRole("link", { name: "Staff workspace" }).click();
  await page
    .getByRole("textbox", { name: "Search registrations" })
    .fill(reference);
  await page
    .getByRole("button", { name: new RegExp("DT Demo Test Registrant") })
    .click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".selected-row")).toContainText("Approved");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.getByLabel("Reason for rejection").fill("Demo review outcome.");
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(page.locator(".selected-row")).toContainText("Rejected");
  await page
    .getByRole("link", { name: "District overview", exact: true })
    .click();
  await expect(page.locator(".stat-0>strong")).toHaveText("73");
  await expect(
    page.getByRole("img", { name: "Kampala: 7 registrations, 0 approved" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("draft continuation, repeat entry, filters and no-match lookup", async ({
  page,
}) => {
  await page
    .getByRole("link", { name: "New registration", exact: true })
    .first()
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Draft Person");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("link", { name: "View register", exact: true }).click();
  await page.getByLabel("Filter by status").selectOption("draft");
  await page.getByRole("button", { name: /DP Draft Person/ }).click();
  await page.getByRole("link", { name: "Continue draft" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Draft Person",
  );
  await page.getByLabel("Date of birth").fill("2010-04-12");
  await expect(page.getByLabel("Guardian name", { exact: true })).toBeVisible();
  await page.getByLabel("Date of birth").fill("2000-04-12");
  await expect(page.getByLabel("Guardian name", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Register another person" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue("");
  await page
    .getByRole("link", { name: "Registrations", exact: false })
    .first()
    .click();
  await page.getByLabel("Filter by status").selectOption("approved");
  await page.getByLabel("Filter by district").selectOption("Wakiso");
  await page.getByLabel("Filter by education").selectOption("primary");
  const rows = page.locator("tbody>tr");
  await expect(rows).not.toHaveCount(0);
  for (const row of await rows.all()) {
    await expect(row).toContainText("Approved");
    await expect(row).toContainText("Wakiso");
    await expect(row).toContainText("Primary");
  }
  await page
    .getByRole("textbox", { name: "Search registrations" })
    .fill("No such person");
  await expect(
    page.getByRole("heading", { name: "No registrations found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".table-bottom")).toContainText("Page 2");
  await page
    .getByRole("link", { name: "Check registration status", exact: true })
    .click();
  await page.getByLabel("Phone number").fill("0700000000");
  await page.getByLabel("Registration reference").fill("MISSING");
  await page.getByRole("button", { name: "Check registration status" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching registration" }),
  ).toBeVisible();
});
test("mobile views fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of [
    "overview",
    "registrations",
    "staff-entry",
    "register",
    "status",
    "districts",
  ]) {
    await page.goto(`/${route}`);
    if (!["register", "status"].includes(route)) {
      await page
        .getByRole("button", { name: "Enter workspace", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Welcome back." }),
      ).toHaveCount(0);
    }
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/mobile-districts.png",
    fullPage: true,
  });
});
