import type { Transaction } from "../types/transaction";
import { STORAGE_KEY, loadTransactions, saveTransactions } from "./storage";

const tx: Transaction = {
  id: "a",
  type: "expense",
  category: "Water Bill",
  amount: 250.5,
  date: "2026-09-01",
  description: "September",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("storage", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadTransactions()).toEqual([]);
  });

  it("round-trips saved transactions under a single key", () => {
    saveTransactions([tx]);
    expect(loadTransactions()).toEqual([tx]);
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"version":1');
  });

  it("ignores unrelated keys on the same origin", () => {
    localStorage.setItem("some-other-app", "hello");
    saveTransactions([tx]);
    expect(loadTransactions()).toEqual([tx]);
  });

  it("drops invalid entries but keeps valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        transactions: [tx, { ...tx, id: "b", amount: -5 }, { nope: true }],
      }),
    );
    expect(loadTransactions()).toEqual([tx]);
  });

  it("backs up unreadable data instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadTransactions()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEY}:corrupt-backup`)).toBe(
      "{not json",
    );
  });

  it("migrates the legacy one-key-per-transaction format", () => {
    localStorage.setItem("lastKey", "2");
    localStorage.setItem(
      "0",
      JSON.stringify({
        transactionType: "Income",
        category: "Salary",
        amount: "1000",
        date: "2022-06-01",
        description: "June",
      }),
    );
    // Key 1 missing (a gap must not stop the migration).
    localStorage.setItem(
      "2",
      JSON.stringify({
        transactionType: "Expense",
        category: "Rentals",
        amount: "300.456",
        date: "2022-06-02",
        description: "",
      }),
    );

    const migrated = loadTransactions();

    expect(migrated).toHaveLength(2);
    expect(migrated[0]).toMatchObject({
      type: "income",
      category: "Salary",
      amount: 1000,
      date: "2022-06-01",
    });
    expect(migrated[1]).toMatchObject({ type: "expense", amount: 300.46 });
    expect(localStorage.getItem("lastKey")).toBeNull();
    expect(localStorage.getItem("0")).toBeNull();
    expect(loadTransactions()).toEqual(migrated);
  });
});
