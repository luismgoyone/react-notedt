import { EMPTY_DATA, type Transaction } from "../types/transaction";
import { STORAGE_KEY, loadAppData, parseAppData, saveAppData } from "./storage";

const withTransactions = (transactions: Transaction[]) => ({
  ...EMPTY_DATA,
  transactions,
});
const loadTransactions = () => loadAppData().transactions;

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
    expect(loadAppData()).toEqual(EMPTY_DATA);
  });

  it("round-trips saved data under a single key", () => {
    const data = {
      transactions: [tx],
      categories: [{ id: "c", type: "expense" as const, name: "Pets" }],
      budgets: [{ category: "Pets", limit: 500 }],
      recurring: [],
    };
    saveAppData(data);
    expect(loadAppData()).toEqual(data);
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"version":2');
  });

  it("ignores unrelated keys on the same origin", () => {
    localStorage.setItem("some-other-app", "hello");
    saveAppData(withTransactions([tx]));
    expect(loadTransactions()).toEqual([tx]);
  });

  it("drops invalid entries but keeps valid ones", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        transactions: [tx, { ...tx, id: "b", amount: -5 }, { nope: true }],
        budgets: [{ category: "Rentals", limit: 0 }],
      }),
    );
    expect(loadAppData()).toEqual(withTransactions([tx]));
  });

  it("backs up unreadable data instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadTransactions()).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEY}:corrupt-backup`)).toBe(
      "{not json",
    );
  });

  it("migrates the 1.0 transactions-only format", () => {
    localStorage.setItem(
      "notedt:transactions",
      JSON.stringify({ version: 1, transactions: [tx] }),
    );
    expect(loadAppData()).toEqual(withTransactions([tx]));
    expect(localStorage.getItem("notedt:transactions")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("rejects values that aren't Notedt data", () => {
    expect(parseAppData(null)).toBeNull();
    expect(parseAppData({ hello: "world" })).toBeNull();
    expect(parseAppData([])).toBeNull();
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
