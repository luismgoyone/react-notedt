import type {
  Transaction,
  TransactionFilters,
  TransactionType,
} from "../types/transaction";
import { TYPE_LABELS } from "./categories";
import { formatCurrency, formatDate } from "./format";

/** Sums in centavos so repeated additions don't drift (0.1 + 0.2). */
function sumAmounts(transactions: Transaction[]) {
  const cents = transactions.reduce(
    (total, tx) => total + Math.round(tx.amount * 100),
    0,
  );
  return cents / 100;
}

export function getTotals(transactions: Transaction[]) {
  const income = sumAmounts(transactions.filter((tx) => tx.type === "income"));
  const expense = sumAmounts(
    transactions.filter((tx) => tx.type === "expense"),
  );
  const savings = (Math.round(income * 100) - Math.round(expense * 100)) / 100;
  return { income, expense, savings };
}

export interface CategoryTotal {
  category: string;
  total: number;
  share: number;
}

/** Totals per category for one type, largest first. */
export function getCategoryTotals(
  transactions: Transaction[],
  type: TransactionType,
): CategoryTotal[] {
  const byCategory = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    byCategory.set(tx.category, [...(byCategory.get(tx.category) ?? []), tx]);
  }
  const rows = [...byCategory].map(([category, items]) => ({
    category,
    total: sumAmounts(items),
  }));
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  return rows
    .map((row) => ({
      ...row,
      share: grandTotal > 0 ? row.total / grandTotal : 0,
    }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

/** Newest date first; ties go to the most recently created. */
export function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export function matchesSearch(tx: Transaction, term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const fields = [
    tx.category,
    tx.description,
    TYPE_LABELS[tx.type],
    tx.date,
    formatDate(tx.date),
    tx.amount.toFixed(2),
    formatCurrency(tx.amount),
  ];
  return fields.some((field) => field.toLowerCase().includes(needle));
}

export function matchesFilters(tx: Transaction, filters: TransactionFilters) {
  if (!filters.types.includes(tx.type)) return false;
  if (filters.from && tx.date < filters.from) return false;
  if (filters.to && tx.date > filters.to) return false;
  if (filters.min !== null && tx.amount < filters.min) return false;
  if (filters.max !== null && tx.amount > filters.max) return false;
  return true;
}

export function countActiveFilters(filters: TransactionFilters) {
  return [
    filters.from,
    filters.to,
    filters.types.length !== 2,
    filters.min !== null,
    filters.max !== null,
  ].filter(Boolean).length;
}
