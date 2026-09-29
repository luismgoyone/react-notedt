import type { Transaction } from "../types/transaction";
import { parseCsv, parseTransactionsCsv, transactionsToCsv } from "./csv";

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: "1",
  type: "expense",
  category: "Food & Beverages",
  amount: 1250.5,
  date: "2026-09-01",
  description: "",
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

describe("csv", () => {
  it("parses quotes, escaped quotes, commas and newlines", () => {
    expect(parseCsv('a,"b, c","say ""hi""\nthere"\r\n1,2,3\n')).toEqual([
      ["a", "b, c", 'say "hi"\nthere'],
      ["1", "2", "3"],
    ]);
  });

  it("round-trips exported transactions", () => {
    const csv = transactionsToCsv([
      tx({ description: 'Lunch, "team"' }),
      tx({ type: "income", category: "Salary", amount: 45000 }),
    ]);
    expect(csv.split("\r\n")[0]).toBe("date,type,category,amount,description");
    expect(parseTransactionsCsv(csv)).toEqual({
      transactions: [
        {
          type: "expense",
          date: "2026-09-01",
          category: "Food & Beverages",
          amount: 1250.5,
          description: 'Lunch, "team"',
        },
        {
          type: "income",
          date: "2026-09-01",
          category: "Salary",
          amount: 45000,
          description: "",
        },
      ],
      skipped: [],
    });
  });

  it("neutralizes spreadsheet formulas on export and restores them on import", () => {
    const csv = transactionsToCsv([tx({ description: "=HYPERLINK(1)" })]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(parseTransactionsCsv(csv).transactions[0]!.description).toBe(
      "=HYPERLINK(1)",
    );
  });

  it("accepts any column order, currency symbols, and reports bad rows", () => {
    const result = parseTransactionsCsv(
      [
        "Amount,Category,Type,Date",
        '"₱1,500.00",Rentals,Expense,2026-09-02',
        "10,Rentals,refund,2026-09-02",
        "abc,Rentals,expense,2026-09-02",
        "10,Rentals,expense,09/02/2026",
        "10,,expense,2026-09-02",
      ].join("\n"),
    );
    expect(result.transactions).toEqual([
      {
        type: "expense",
        date: "2026-09-02",
        category: "Rentals",
        amount: 1500,
        description: "",
      },
    ]);
    expect(result.skipped.map((s) => s.line)).toEqual([3, 4, 5, 6]);
  });

  it("rejects files without the required columns", () => {
    expect(() => parseTransactionsCsv("date,amount\n2026-01-01,5")).toThrow(
      "Missing columns: type, category.",
    );
    expect(() => parseTransactionsCsv("")).toThrow("The file is empty.");
  });
});
