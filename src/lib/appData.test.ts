import { EMPTY_DATA, type AppData } from "../types/transaction";
import {
  addCategory,
  removeCategory,
  renameCategory,
  setBudget,
  setRecurringActive,
} from "./appData";

let n = 0;
const ids = () => `id-${++n}`;

const base: AppData = {
  ...EMPTY_DATA,
  categories: [{ id: "pets", type: "expense", name: "Pets" }],
  budgets: [{ category: "Pets", limit: 1000 }],
  transactions: [
    {
      id: "t1",
      type: "expense",
      category: "Pets",
      amount: 300,
      date: "2026-09-01",
      description: "",
      createdAt: "",
      updatedAt: "",
    },
  ],
  recurring: [
    {
      id: "r1",
      type: "expense",
      category: "Pets",
      amount: 500,
      description: "",
      dayOfMonth: 1,
      startDate: "2026-01-01",
      generatedThrough: "2026-06",
      active: false,
      createdAt: "",
    },
  ],
};

describe("custom categories", () => {
  it("rejects duplicates, including built-in names", () => {
    expect(() => addCategory(base, "expense", " pets ", ids)).toThrow(
      "already exists",
    );
    expect(() => addCategory(base, "expense", "rentals", ids)).toThrow(
      "already exists",
    );
    // Same name is fine for the other type.
    expect(
      addCategory(base, "income", "Pets", ids).data.categories,
    ).toHaveLength(2);
  });

  it("renames everywhere the category is used", () => {
    const next = renameCategory(base, "pets", "Pet care");
    expect(next.categories[0]!.name).toBe("Pet care");
    expect(next.transactions[0]!.category).toBe("Pet care");
    expect(next.recurring[0]!.category).toBe("Pet care");
    expect(next.budgets[0]!.category).toBe("Pet care");
  });

  it("deleting keeps history but drops the budget", () => {
    const next = removeCategory(base, "pets");
    expect(next.categories).toEqual([]);
    expect(next.budgets).toEqual([]);
    expect(next.transactions[0]!.category).toBe("Pets");
  });
});

describe("budgets", () => {
  it("adds or replaces one budget per category", () => {
    expect(setBudget(base, "Pets", 1500.555).budgets).toEqual([
      { category: "Pets", limit: 1500.56 },
    ]);
    expect(setBudget(base, "Rentals", 12000).budgets).toHaveLength(2);
  });
});

describe("recurring", () => {
  it("resuming skips the paused months", () => {
    const next = setRecurringActive(base, "r1", true, "2026-09-29");
    expect(next.recurring[0]).toMatchObject({
      active: true,
      startDate: "2026-09-29",
      generatedThrough: "2026-06",
    });
  });
});
