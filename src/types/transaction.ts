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
