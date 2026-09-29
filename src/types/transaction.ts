export const TRANSACTION_TYPES = ["income", "expense"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  /** Amount in pesos, always positive; the type decides the sign. */
  amount: number;
  /** Calendar date as `YYYY-MM-DD`. */
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Set when a recurring rule created this transaction. */
  recurringId?: string;
}

export type TransactionInput = Pick<
  Transaction,
  "type" | "category" | "amount" | "date" | "description"
>;

export interface TransactionFilters {
  from: string;
  to: string;
  types: TransactionType[];
  min: number | null;
  max: number | null;
}

export const EMPTY_FILTERS: TransactionFilters = {
  from: "",
  to: "",
  types: [...TRANSACTION_TYPES],
  min: null,
  max: null,
};

export interface CustomCategory {
  id: string;
  type: TransactionType;
  name: string;
}

export interface Budget {
  /** Expense category the monthly limit applies to. */
  category: string;
  limit: number;
}

export interface RecurringRule {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  /** 1–31; months without that day use their last day. */
  dayOfMonth: number;
  /** No occurrences are created before this `YYYY-MM-DD` date. */
  startDate: string;
  /** Last `YYYY-MM` month already handled, or null if none yet. */
  generatedThrough: string | null;
  active: boolean;
  createdAt: string;
}

export type RecurringInput = Pick<
  RecurringRule,
  "type" | "category" | "amount" | "description" | "dayOfMonth" | "startDate"
>;

export interface AppData {
  transactions: Transaction[];
  categories: CustomCategory[];
  budgets: Budget[];
  recurring: RecurringRule[];
}

export const EMPTY_DATA: AppData = {
  transactions: [],
  categories: [],
  budgets: [],
  recurring: [],
};
