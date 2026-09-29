import type {
  AppData,
  CustomCategory,
  RecurringInput,
  RecurringRule,
  Transaction,
  TransactionInput,
  TransactionType,
} from "../types/transaction";
import { validateCategoryName } from "./categories";

/** Pure updates for AppData. Each returns a new object; inputs are trusted. */

const round2 = (amount: number) => Math.round(amount * 100) / 100;

function normalizeTransaction(input: TransactionInput): TransactionInput {
  return {
    type: input.type,
    category: input.category,
    date: input.date,
    amount: round2(input.amount),
    description: input.description.trim(),
  };
}

export function addTransactions(
  data: AppData,
  inputs: TransactionInput[],
  createId: () => string,
  now: string,
): { data: AppData; created: Transaction[] } {
  const created = inputs.map((input) => ({
    ...normalizeTransaction(input),
    id: createId(),
    createdAt: now,
    updatedAt: now,
  }));
  return {
    data: { ...data, transactions: [...data.transactions, ...created] },
    created,
  };
}

export function updateTransaction(
  data: AppData,
  id: string,
  input: TransactionInput,
  now: string,
): { data: AppData; updated: Transaction } {
  const existing = data.transactions.find((tx) => tx.id === id);
  if (!existing) throw new Error("Transaction no longer exists");
  const updated = {
    ...existing,
    ...normalizeTransaction(input),
    updatedAt: now,
  };
  return {
    data: {
      ...data,
      transactions: data.transactions.map((tx) =>
        tx.id === id ? updated : tx,
      ),
    },
    updated,
  };
}

export function removeTransaction(data: AppData, id: string): AppData {
  return {
    ...data,
    transactions: data.transactions.filter((tx) => tx.id !== id),
  };
}

export function restoreTransaction(data: AppData, tx: Transaction): AppData {
  if (data.transactions.some((existing) => existing.id === tx.id)) return data;
  return { ...data, transactions: [...data.transactions, tx] };
}

export function addCategory(
  data: AppData,
  type: TransactionType,
  name: string,
  createId: () => string,
): { data: AppData; category: CustomCategory } {
  const error = validateCategoryName(name, type, data.categories);
  if (error) throw new Error(error);
  const category = { id: createId(), type, name: name.trim() };
  return {
    data: { ...data, categories: [...data.categories, category] },
    category,
  };
}

/** Renames a custom category everywhere it's used. */
export function renameCategory(
  data: AppData,
  id: string,
  name: string,
): AppData {
  const category = data.categories.find((c) => c.id === id);
  if (!category) throw new Error("Category no longer exists");
  const error = validateCategoryName(name, category.type, data.categories, id);
  if (error) throw new Error(error);
  const next = name.trim();
  const matches = (item: { type: TransactionType; category: string }) =>
    item.type === category.type && item.category === category.name;
  return {
    categories: data.categories.map((c) =>
      c.id === id ? { ...c, name: next } : c,
    ),
    transactions: data.transactions.map((tx) =>
      matches(tx) ? { ...tx, category: next } : tx,
    ),
    recurring: data.recurring.map((rule) =>
      matches(rule) ? { ...rule, category: next } : rule,
    ),
    budgets:
      category.type === "expense"
        ? data.budgets.map((b) =>
            b.category === category.name ? { ...b, category: next } : b,
          )
        : data.budgets,
  };
}

/**
 * Removes a custom category and its budget. Existing transactions and
 * recurring rules keep the name, so history isn't rewritten.
 */
export function removeCategory(data: AppData, id: string): AppData {
  const category = data.categories.find((c) => c.id === id);
  if (!category) return data;
  return {
    ...data,
    categories: data.categories.filter((c) => c.id !== id),
    budgets:
      category.type === "expense"
        ? data.budgets.filter((b) => b.category !== category.name)
        : data.budgets,
  };
}

export function setBudget(
  data: AppData,
  category: string,
  limit: number,
): AppData {
  const budget = { category, limit: round2(limit) };
  const exists = data.budgets.some((b) => b.category === category);
  return {
    ...data,
    budgets: exists
      ? data.budgets.map((b) => (b.category === category ? budget : b))
      : [...data.budgets, budget],
  };
}

export function removeBudget(data: AppData, category: string): AppData {
  return {
    ...data,
    budgets: data.budgets.filter((b) => b.category !== category),
  };
}

function normalizeRule(input: RecurringInput): RecurringInput {
  return {
    type: input.type,
    category: input.category,
    amount: round2(input.amount),
    description: input.description.trim(),
    dayOfMonth: input.dayOfMonth,
    startDate: input.startDate,
  };
}

export function addRecurring(
  data: AppData,
  input: RecurringInput,
  createId: () => string,
  now: string,
): { data: AppData; rule: RecurringRule } {
  const rule: RecurringRule = {
    ...normalizeRule(input),
    id: createId(),
    generatedThrough: null,
    active: true,
    createdAt: now,
  };
  return { data: { ...data, recurring: [...data.recurring, rule] }, rule };
}

/** Edits apply to future occurrences; already-created ones are kept. */
export function updateRecurring(
  data: AppData,
  id: string,
  input: RecurringInput,
): AppData {
  return {
    ...data,
    recurring: data.recurring.map((rule) =>
      rule.id === id ? { ...rule, ...normalizeRule(input) } : rule,
    ),
  };
}

/** Resuming skips the paused months instead of backfilling them. */
export function setRecurringActive(
  data: AppData,
  id: string,
  active: boolean,
  today: string,
): AppData {
  return {
    ...data,
    recurring: data.recurring.map((rule) => {
      if (rule.id !== id || rule.active === active) return rule;
      if (!active) return { ...rule, active };
      return {
        ...rule,
        active,
        startDate: rule.startDate > today ? rule.startDate : today,
      };
    }),
  };
}

export function removeRecurring(data: AppData, id: string): AppData {
  return {
    ...data,
    recurring: data.recurring.filter((rule) => rule.id !== id),
  };
}

export function restoreRecurring(data: AppData, rule: RecurringRule): AppData {
  if (data.recurring.some((existing) => existing.id === rule.id)) return data;
  return { ...data, recurring: [...data.recurring, rule] };
}
