import { createContext } from "react";
import type {
  AppData,
  RecurringInput,
  RecurringRule,
  Transaction,
  TransactionInput,
  TransactionType,
} from "../types/transaction";

export interface AppDataContextValue {
  data: AppData;
  addTransaction: (input: TransactionInput) => Transaction;
  updateTransaction: (id: string, input: TransactionInput) => Transaction;
  /** Returns the removed transaction so it can be restored (undo). */
  deleteTransaction: (id: string) => Transaction | undefined;
  restoreTransaction: (tx: Transaction) => void;
  importTransactions: (inputs: TransactionInput[]) => number;
  replaceData: (data: AppData) => void;
  addCategory: (type: TransactionType, name: string) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  setBudget: (category: string, limit: number) => void;
  deleteBudget: (category: string) => void;
  addRecurring: (input: RecurringInput) => void;
  updateRecurring: (id: string, input: RecurringInput) => void;
  setRecurringActive: (id: string, active: boolean) => void;
  deleteRecurring: (id: string) => RecurringRule | undefined;
  restoreRecurring: (rule: RecurringRule) => void;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);
