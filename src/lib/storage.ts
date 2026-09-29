import {
  TRANSACTION_TYPES,
  type Transaction,
  type TransactionType,
} from "../types/transaction";
import { isISODate } from "./format";

export const STORAGE_KEY = "notedt:transactions";
const STORAGE_VERSION = 1;
const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}:corrupt-backup`;

// Pre-1.0 builds stored one transaction per numeric key plus a "lastKey" counter.
const LEGACY_LAST_KEY = "lastKey";

interface StoredPayload {
  version: number;
  transactions: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    TRANSACTION_TYPES.includes(value.type as TransactionType) &&
    typeof value.category === "string" &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount > 0 &&
    isISODate(value.date) &&
    typeof value.description === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
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

export function saveTransactions(
  transactions: Transaction[],
  storage: Storage = localStorage,
) {
  const payload: StoredPayload = { version: STORAGE_VERSION, transactions };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Reads saved transactions, migrating the legacy per-key format once.
 * Invalid entries are dropped; unreadable data is backed up, never discarded.
 */
export function loadTransactions(
  storage: Storage = localStorage,
): Transaction[] {
  const raw = storage.getItem(STORAGE_KEY);

  if (raw === null) {
    const legacy = readLegacy(storage);
    if (legacy === null) return [];
    saveTransactions(legacy, storage);
    clearLegacy(storage);
    return legacy;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const items =
      isRecord(parsed) && Array.isArray(parsed.transactions)
        ? parsed.transactions
        : null;
    if (!items) throw new Error("Unexpected storage shape");
    return items.filter(isTransaction);
  } catch {
    if (storage.getItem(CORRUPT_BACKUP_KEY) === null) {
      storage.setItem(CORRUPT_BACKUP_KEY, raw);
    }
    return [];
  }
}
