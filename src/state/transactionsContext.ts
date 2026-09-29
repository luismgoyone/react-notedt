import { createContext } from "react";
import type { Transaction, TransactionInput } from "../types/transaction";

export interface TransactionsContextValue {
  transactions: Transaction[];
  addTransaction: (input: TransactionInput) => Transaction;
  updateTransaction: (id: string, input: TransactionInput) => Transaction;
  deleteTransaction: (id: string) => void;
}

export const TransactionsContext =
  createContext<TransactionsContextValue | null>(null);
