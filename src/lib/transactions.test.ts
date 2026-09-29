import { EMPTY_FILTERS, type Transaction } from "../types/transaction";
import { formatDate } from "./format";
import {
  countActiveFilters,
  getBudgetProgress,
  getMonthRange,
  getMonthSummary,
  percentChange,
  getCategoryTotals,
  getTotals,
  matchesFilters,
  matchesSearch,
  sortTransactions,
} from "./transactions";

let seq = 0;
function make(overrides: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `id-${seq}`,
    type: "expense",
    category: "Water Bill",
    amount: 100,
    date: "2026-09-01",
    description: "",
    createdAt: `2026-09-01T00:00:${String(seq).padStart(2, "0")}.000Z`,
    updatedAt: `2026-09-01T00:00:${String(seq).padStart(2, "0")}.000Z`,
    ...overrides,
  };
}

describe("getTotals", () => {
  it("sums without floating point drift", () => {
    const totals = getTotals([
      make({ type: "income", amount: 0.1 }),
      make({ type: "income", amount: 0.2 }),
      make({ type: "expense", amount: 0.3 }),
    ]);
    expect(totals).toEqual({ income: 0.3, expense: 0.3, savings: 0 });
  });
});

describe("getCategoryTotals", () => {
  it("aggregates per category and sorts largest first", () => {
    const rows = getCategoryTotals(
      [
        make({ category: "Rentals", amount: 50 }),
        make({ category: "Water Bill", amount: 100 }),
        make({ category: "Rentals", amount: 100 }),
        make({ type: "income", category: "Salary", amount: 999 }),
      ],
      "expense",
    );
    expect(rows).toEqual([
      { category: "Rentals", total: 150, share: 0.6 },
      { category: "Water Bill", total: 100, share: 0.4 },
    ]);
  });
});

describe("sortTransactions", () => {
  it("orders by date, newest first, then by creation time", () => {
    const older = make({ date: "2026-01-01" });
    const first = make({ date: "2026-05-01" });
    const second = make({ date: "2026-05-01" });
    expect(sortTransactions([older, first, second])).toEqual([
      second,
      first,
      older,
    ]);
  });
});

describe("matchesSearch", () => {
  const tx = make({ category: "Phone Bill", description: "Globe postpaid" });

  it("matches individual fields case-insensitively", () => {
    expect(matchesSearch(tx, "globe")).toBe(true);
    expect(matchesSearch(tx, "PHONE")).toBe(true);
    expect(matchesSearch(tx, "expense")).toBe(true);
    expect(matchesSearch(tx, formatDate(tx.date))).toBe(true);
  });

  it("does not match text spanning two fields", () => {
    expect(matchesSearch(tx, "billglobe")).toBe(false);
  });
});

describe("filters", () => {
  const tx = make({ amount: 500, date: "2026-03-15" });

  it("applies type, date and amount bounds inclusively", () => {
    expect(matchesFilters(tx, EMPTY_FILTERS)).toBe(true);
    expect(matchesFilters(tx, { ...EMPTY_FILTERS, types: ["income"] })).toBe(
      false,
    );
    expect(
      matchesFilters(tx, {
        ...EMPTY_FILTERS,
        from: "2026-03-15",
        to: "2026-03-15",
      }),
    ).toBe(true);
    expect(matchesFilters(tx, { ...EMPTY_FILTERS, from: "2026-03-16" })).toBe(
      false,
    );
    expect(matchesFilters(tx, { ...EMPTY_FILTERS, min: 500, max: 500 })).toBe(
      true,
    );
    expect(matchesFilters(tx, { ...EMPTY_FILTERS, max: 499.99 })).toBe(false);
  });

  it("counts active filters", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(
      countActiveFilters({ ...EMPTY_FILTERS, from: "2026-01-01", min: 0 }),
    ).toBe(2);
  });
});

describe("monthly", () => {
  const data = [
    make({ type: "income", amount: 1000, date: "2026-08-01" }),
    make({ type: "expense", amount: 400, date: "2026-08-15" }),
    make({ type: "income", amount: 1500, date: "2026-09-01" }),
    make({
      type: "expense",
      category: "Rentals",
      amount: 300,
      date: "2026-09-02",
    }),
    make({
      type: "expense",
      category: "Rentals",
      amount: 900,
      date: "2026-09-20",
    }),
  ];

  it("summarizes a month and the one before it", () => {
    expect(getMonthSummary(data, "2026-09")).toEqual({
      current: { income: 1500, expense: 1200, savings: 300 },
      previous: { income: 1000, expense: 400, savings: 600 },
    });
    expect(getMonthSummary(data, "2026-08").previous).toBeNull();
    expect(percentChange(1500, 1000)).toBe(0.5);
    expect(percentChange(1500, undefined)).toBeNull();
  });

  it("tracks budget use for the month, most used first", () => {
    const progress = getBudgetProgress(
      data,
      [
        { category: "Rentals", limit: 1000 },
        { category: "Water Bill", limit: 500 },
      ],
      "2026-09",
    );
    expect(progress).toEqual([
      {
        category: "Rentals",
        limit: 1000,
        spent: 1200,
        remaining: -200,
        ratio: 1.2,
      },
      {
        category: "Water Bill",
        limit: 500,
        spent: 0,
        remaining: 500,
        ratio: 0,
      },
    ]);
  });

  it("finds the range of months with data", () => {
    expect(getMonthRange(data)).toEqual({ first: "2026-08", last: "2026-09" });
    expect(getMonthRange([])).toBeNull();
  });
});
