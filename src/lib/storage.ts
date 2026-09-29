import {
  EMPTY_DATA,
  TRANSACTION_TYPES,
  type AppData,
  type Budget,
  type CustomCategory,
  type RecurringRule,
  type Transaction,
  type TransactionType,
} from "../types/transaction";
import { isISODate } from "./format";
import { isMonthKey } from "./month";

export const STORAGE_KEY = "notedt:data";
const STORAGE_VERSION = 2;
const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}:corrupt-backup`;

// v1 (1.0) stored only transactions under this key.
const V1_KEY = "notedt:transactions";
// Pre-1.0 builds stored one transaction per numeric key plus a "lastKey" counter.
const LEGACY_LAST_KEY = "lastKey";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isType(value: unknown): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isType(value.type) &&
    typeof value.category === "string" &&
    isAmount(value.amount) &&
    isISODate(value.date) &&
    typeof value.description === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.recurringId === undefined || typeof value.recurringId === "string")
  );
}

function isCustomCategory(value: unknown): value is CustomCategory {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isType(value.type) &&
    typeof value.name === "string" &&
    value.name.trim() !== ""
  );
}

function isBudget(value: unknown): value is Budget {
  return (
    isRecord(value) &&
    typeof value.category === "string" &&
    isAmount(value.limit)
  );
}

function isRecurringRule(value: unknown): value is RecurringRule {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isType(value.type) &&
    typeof value.category === "string" &&
    isAmount(value.amount) &&
    typeof value.description === "string" &&
    Number.isInteger(value.dayOfMonth) &&
    (value.dayOfMonth as number) >= 1 &&
    (value.dayOfMonth as number) <= 31 &&
    isISODate(value.startDate) &&
    (value.generatedThrough === null || isMonthKey(value.generatedThrough)) &&
    typeof value.active === "boolean" &&
    typeof value.createdAt === "string"
  );
}

function list<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}

/**
 * Validates data from storage or an imported backup. Accepts the current
 * format and the 1.0 transactions-only format; invalid entries are dropped.
 * Returns null when the value isn't Notedt data at all.
 */
export function parseAppData(value: unknown): AppData | null {
  if (!isRecord(value) || !Array.isArray(value.transactions)) return null;
  const budgets = list(value.budgets, isBudget);
  return {
    transactions: list(value.transactions, isTransaction),
    categories: list(value.categories, isCustomCategory),
    // Keep one budget per category.
    budgets: budgets.filter(
      (budget, index) =>
        budgets.findIndex((b) => b.category === budget.category) === index,
    ),
    recurring: list(value.recurring, isRecurringRule),
  };
}

export function serializeAppData(data: AppData) {
  return JSON.stringify({ version: STORAGE_VERSION, ...data });
}

export function createId() {
  return crypto.randomUUID();
}

function fromLegacy(value: unknown, index: number): Transaction | null {
  if (!isRecord(value)) return null;
  const type =
    value.transactionType === "Income"
      ? "income"
      : value.transactionType === "Expense"
        ? "expense"
        : null;
  const amount = Number.parseFloat(String(value.amount));
  if (!type || !Number.isFinite(amount) || amount <= 0) return null;
  if (!isISODate(value.date)) return null;
  // Order legacy items by their original key so sorting stays stable.
  const timestamp = new Date(Date.UTC(2000, 0, 1, 0, 0, index)).toISOString();
  return {
    id: createId(),
    type,
    category: typeof value.category === "string" ? value.category : "Other",
    amount: Math.round(amount * 100) / 100,
    date: value.date,
    description:
      typeof value.description === "string" ? value.description.trim() : "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function readLegacy(storage: Storage): Transaction[] | null {
  const lastKey = storage.getItem(LEGACY_LAST_KEY);
  if (lastKey === null) return null;
  const last = Number.parseInt(lastKey, 10);
  const migrated: Transaction[] = [];
  for (let key = 0; Number.isFinite(last) && key <= last; key++) {
    const raw = storage.getItem(String(key));
    if (raw === null) continue;
    try {
      const tx = fromLegacy(JSON.parse(raw), key);
      if (tx) migrated.push(tx);
    } catch {
      // Skip unreadable legacy entries rather than losing the rest.
    }
  }
  return migrated;
}

function clearLegacy(storage: Storage) {
  const lastKey = Number.parseInt(storage.getItem(LEGACY_LAST_KEY) ?? "", 10);
  for (let key = 0; Number.isFinite(lastKey) && key <= lastKey; key++) {
    storage.removeItem(String(key));
  }
  storage.removeItem(LEGACY_LAST_KEY);
}

export function saveAppData(data: AppData, storage: Storage = localStorage) {
  storage.setItem(STORAGE_KEY, serializeAppData(data));
}

function parseStored(raw: string, storage: Storage, backupKey: string) {
  try {
    const data = parseAppData(JSON.parse(raw));
    if (!data) throw new Error("Unexpected storage shape");
    return data;
  } catch {
    if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
    return null;
  }
}

/**
 * Reads saved data, migrating older formats once. Invalid entries are
 * dropped; unreadable data is backed up, never discarded.
 */
export function loadAppData(storage: Storage = localStorage): AppData {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw !== null) {
    return parseStored(raw, storage, CORRUPT_BACKUP_KEY) ?? EMPTY_DATA;
  }

  const v1 = storage.getItem(V1_KEY);
  if (v1 !== null) {
    const data = parseStored(v1, storage, `${V1_KEY}:corrupt-backup`);
    if (!data) return EMPTY_DATA;
    saveAppData(data, storage);
    storage.removeItem(V1_KEY);
    return data;
  }

  const legacy = readLegacy(storage);
  if (legacy === null) return EMPTY_DATA;
  const data = { ...EMPTY_DATA, transactions: legacy };
  saveAppData(data, storage);
  clearLegacy(storage);
  return data;
}
