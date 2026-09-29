import { expect, test, type Page } from "@playwright/test";

async function addTransaction(
  page: Page,
  values: { type?: "Income" | "Expense"; category: string; amount: string },
) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Add transaction" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  if (values.type) await dialog.getByText(values.type, { exact: true }).click();
  await dialog.getByLabel("Category").selectOption(values.category);
  await dialog.getByLabel("Amount (PHP)").fill(values.amount);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
}

test("add, edit, delete and undo a transaction", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page.getByText("No transactions")).toBeVisible();

  await addTransaction(page, {
    type: "Income",
    category: "Salary",
    amount: "45000",
  });
  await addTransaction(page, { category: "Rentals", amount: "12000" });
  await expect(page.getByTestId("savings")).toHaveText(/33,000\.00/);

  await page.getByRole("button", { name: /^Edit Rentals/ }).click();
  const edit = page.getByRole("dialog", { name: "Edit transaction" });
  await edit.getByLabel("Amount (PHP)").fill("15000");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByTestId("savings")).toHaveText(/30,000\.00/);

  await page.getByRole("button", { name: /^Delete Rentals/ }).click();
  await expect(page.getByTestId("savings")).toHaveText(/45,000\.00/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("savings")).toHaveText(/30,000\.00/);

  // Survives a reload.
  await page.reload();
  await expect(
    page.getByRole("button", { name: /^Edit Rentals/ }),
  ).toBeVisible();
});

test("overview shows the month with budgets", async ({ page }) => {
  await page.goto("/plan");
  await page.getByRole("button", { name: "Add budget" }).click();
  const dialog = page.getByRole("dialog", { name: "Add budget" });
  await dialog.getByLabel("Expense category").selectOption("Rentals");
  await dialog.getByLabel("Monthly limit (PHP)").fill("10000");
  await dialog.getByRole("button", { name: "Save" }).click();

  await addTransaction(page, { category: "Rentals", amount: "12000" });
  await page.goto("/");
  await expect(page.getByText("Over by ₱2,000.00")).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Expenses" })).toContainText(
    "Rentals",
  );
});

test("layout fits the screen without horizontal scrolling", async ({
  page,
}) => {
  await page.goto("/");
  await addTransaction(page, { category: "Food & Beverages", amount: "250" });
  for (const path of ["/", "/transactions", "/plan", "/settings"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test("dark mode persists across reloads", async ({ page }) => {
  await page.goto("/settings");
  await page.getByText("Dark", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The first load isn't controlled yet; reload so the worker serves it.
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/transactions");
  await expect(
    page
      .getByRole("heading", { name: "Transaction details" })
      .or(page.getByText("No transactions")),
  ).toBeVisible();
  await context.setOffline(false);
});
