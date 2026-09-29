import type {
  Budget,
  Transaction,
  TransactionFilters,
  TransactionType,
} from "../types/transaction";
import { TYPE_LABELS } from "./categories";
import { formatCurrency, formatDate } from "./format";
import { addMonths, toMonthKey, type MonthKey } from "./month";

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

export function inMonth(transactions: Transaction[], month: MonthKey) {
  return transactions.filter((tx) => toMonthKey(tx.date) === month);
}

/** Month totals plus the change from the previous month (null if no data). */
export function getMonthSummary(transactions: Transaction[], month: MonthKey) {
  const current = getTotals(inMonth(transactions, month));
  const previousTransactions = inMonth(transactions, addMonths(month, -1));
  const previous =
    previousTransactions.length > 0 ? getTotals(previousTransactions) : null;
  return { current, previous };
}

/** Relative change, or null when there's nothing to compare against. */
export function percentChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export interface BudgetProgress extends Budget {
  spent: number;
  remaining: number;
  /** spent / limit; above 1 means over budget. */
  ratio: number;
}

export function getBudgetProgress(
  transactions: Transaction[],
  budgets: Budget[],
  month: MonthKey,
): BudgetProgress[] {
  const monthExpenses = inMonth(transactions, month).filter(
    (tx) => tx.type === "expense",
  );
  return budgets
    .map((budget) => {
      const spent = sumAmounts(
        monthExpenses.filter((tx) => tx.category === budget.category),
      );
      return {
        ...budget,
        spent,
        remaining:
          (Math.round(budget.limit * 100) - Math.round(spent * 100)) / 100,
        ratio: spent / budget.limit,
      };
    })
    .sort((a, b) => b.ratio - a.ratio || a.category.localeCompare(b.category));
}

/** Earliest and latest months that have transactions. */
export function getMonthRange(transactions: Transaction[]) {
  if (transactions.length === 0) return null;
  let first = transactions[0]!.date;
  let last = first;
  for (const tx of transactions) {
    if (tx.date < first) first = tx.date;
    if (tx.date > last) last = tx.date;
  }
  return { first: toMonthKey(first), last: toMonthKey(last) };
}
