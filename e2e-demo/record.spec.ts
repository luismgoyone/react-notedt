import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import type { AppData, Transaction } from "../src/types/transaction";

const VIEWPORT = { width: 1280, height: 800 };
const OUT = "test-results/demo/notedt";

type Tx = [
  type: "income" | "expense",
  category: string,
  amount: number,
  day: number,
  description: string,
];

// One typical month; the current month only gets the days that have passed.
const MONTH: Tx[] = [
  ["income", "Other", 8500, 22, "Freelance design work"],
  ["expense", "Electricity Bill", 2840, 8, "Meralco"],
  ["expense", "Water Bill", 460, 10, "Maynilad"],
  ["expense", "Internet Bill", 1699, 12, "Fiber 300 Mbps"],
  ["expense", "Phone Bill", 999, 18, "Postpaid plan"],
  ["expense", "Food & Beverages", 3250, 3, "Weekly groceries"],
  ["expense", "Food & Beverages", 2980, 11, "Weekly groceries"],
  ["expense", "Food & Beverages", 1320, 14, "Dinner out"],
  ["expense", "Food & Beverages", 640, 6, "Coffee beans"],
  ["expense", "Fitness", 1500, 2, "Gym membership"],
  ["expense", "Television Bill", 549, 9, "Streaming"],
  ["expense", "Other Entertainment Expenses", 1850, 13, "Concert tickets"],
  ["expense", "Personal Item", 1290, 7, "Running shoes"],
  ["expense", "Vehicle Maintenance", 2200, 20, "Oil change"],
  ["expense", "Gifts & Donations", 1000, 25, "Birthday gift"],
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Five months of plausible data in the app's `notedt:data` (v2) format. */
function seedData(today = new Date()): AppData & { version: number } {
  const transactions: Transaction[] = [];
  const now = today.toISOString();
  for (let back = 4; back >= 0; back--) {
    const first = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const ym = `${first.getFullYear()}-${pad(first.getMonth() + 1)}`;
    const last =
      back === 0
        ? today.getDate()
        : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    MONTH.forEach(([type, category, amount, day, description], i) => {
      if (day > last) return;
      // Vary amounts a little month to month.
      const wobble =
        type === "income" ? 1 : 1 + (((back * 7 + i) % 5) - 2) * 0.06;
      transactions.push({
        id: `seed-${back}-${i}`,
        type,
        category,
        amount: Math.round(amount * wobble),
        date: `${ym}-${pad(day)}`,
        description,
        createdAt: now,
        updatedAt: now,
      });
    });
  }
  const start = new Date(today.getFullYear(), today.getMonth() - 4, 1);
  const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;
  const rule = (
    id: string,
    type: "income" | "expense",
    category: string,
    amount: number,
    dayOfMonth: number,
    description: string,
  ) => ({
    id,
    type,
    category,
    amount,
    description,
    dayOfMonth,
    startDate,
    // The app creates every occurrence due since `startDate` on load.
    generatedThrough: null,
    active: true,
    createdAt: now,
  });
  return {
    version: 2,
    transactions,
    categories: [],
    budgets: [
      { category: "Food & Beverages", limit: 10000 },
      { category: "Electricity Bill", limit: 3000 },
      { category: "Other Entertainment Expenses", limit: 1500 },
      { category: "Personal Item", limit: 2500 },
    ],
    recurring: [
      rule("seed-salary", "income", "Salary", 52000, 15, "Monthly salary"),
      rule("seed-rent", "expense", "Rentals", 14500, 5, "Condo rent"),
    ],
  };
}

/**
 * A ~14s tour for the portfolio site: Overview → add a transaction → Plan.
 * Writes `notedt.webm` plus `notedt.json` (seconds of blank lead-in to trim).
 */
test("record the Notedt demo", async ({ browser }) => {
  const rec = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: "light",
    recordVideo: { dir: OUT, size: VIEWPORT },
  });
  await rec.addInitScript((seed) => {
    if (localStorage.getItem("notedt:data") === null) {
      localStorage.setItem("notedt:data", seed);
      localStorage.setItem("notedt:theme", "light");
    }
  }, JSON.stringify(seedData()));

  const started = Date.now();
  const p = await rec.newPage();
  const pause = (ms: number) => p.waitForTimeout(ms);

  await p.goto("/");
  await expect(
    p.getByRole("heading", { level: 1, name: "Transactions overview" }),
  ).toBeVisible();
  await expect(p.getByRole("heading", { name: "Budgets" })).toBeVisible();
  await p.evaluate(() => document.fonts.ready);
  const leadIn = (Date.now() - started) / 1000;
  await pause(2800);

  // Category breakdown below the budgets.
  await p.mouse.wheel(0, 420);
  await pause(2200);
  await p.mouse.wheel(0, -420);
  await pause(400);

  // Add a transaction.
  await p
    .getByRole("banner")
    .getByRole("button", { name: "Add transaction" })
    .click();
  const dialog = p.getByRole("dialog", { name: "Add transaction" });
  await expect(dialog).toBeVisible();
  await pause(500);
  await dialog.getByLabel("Category").selectOption("Food & Beverages");
  await pause(400);
  await dialog
    .getByLabel("Amount (PHP)")
    .pressSequentially("1450", { delay: 70 });
  await dialog
    .getByLabel("Description")
    .pressSequentially("Team lunch", { delay: 70 });
  await pause(500);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await pause(2200);

  // Budgets and recurring items.
  await p
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Plan" })
    .click();
  await expect(
    p.getByRole("heading", { level: 1, name: "Plan" }),
  ).toBeVisible();
  await pause(3000);

  const video = p.video()!;
  await rec.close();
  await video.saveAs(`${OUT}.webm`);
  await writeFile(`${OUT}.json`, JSON.stringify({ leadIn }, null, 2));
});
