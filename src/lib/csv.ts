import type { Transaction, TransactionInput } from "../types/transaction";
import { isISODate } from "./format";

const COLUMNS = ["date", "type", "category", "amount", "description"] as const;
const MAX_AMOUNT = 1_000_000_000;

// Cells starting with these run as formulas in spreadsheet apps.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: string) {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function transactionsToCsv(transactions: Transaction[]) {
  const rows = transactions.map((tx) =>
    [tx.date, tx.type, tx.category, tx.amount.toFixed(2), tx.description]
      .map(escapeCell)
      .join(","),
  );
  return [COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF or LF line ends. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

export interface CsvImportResult {
  transactions: TransactionInput[];
  skipped: { line: number; reason: string }[];
}

function unescapeCell(value: string) {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

/**
 * Reads transactions from a CSV with a header row. Required columns: date,
 * type, category, amount. Optional: description. Rows that fail validation
 * are reported, not imported.
 */
export function parseTransactionsCsv(text: string): CsvImportResult {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("The file is empty.");

  const index = new Map(
    header.map((name, i) => [name.trim().toLowerCase(), i] as const),
  );
  const missing = COLUMNS.filter(
    (column) => column !== "description" && !index.has(column),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
    );
  }

  const cell = (row: string[], column: (typeof COLUMNS)[number]) => {
    const i = index.get(column);
    return i === undefined ? "" : unescapeCell((row[i] ?? "").trim());
  };

  const result: CsvImportResult = { transactions: [], skipped: [] };
  rows.forEach((row, i) => {
    const line = i + 2; // 1-based, after the header
    const type = cell(row, "type").toLowerCase();
    const date = cell(row, "date");
    const category = cell(row, "category");
    const amount = Number(cell(row, "amount").replace(/[₱,\s]|PHP/gi, ""));

    let reason: string | null = null;
    if (type !== "income" && type !== "expense") {
      reason = "type must be income or expense";
    } else if (!isISODate(date)) {
      reason = "date must be YYYY-MM-DD";
    } else if (!category) {
      reason = "category is empty";
    } else if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
      reason = "amount must be a positive number";
    }
    if (reason) {
      result.skipped.push({ line, reason });
      return;
    }

    result.transactions.push({
      type: type as TransactionInput["type"],
      date,
      category,
      amount: Math.round(amount * 100) / 100,
      description: cell(row, "description").slice(0, 200),
    });
  });
  return result;
}
