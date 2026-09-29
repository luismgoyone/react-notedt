import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  STORAGE_KEY,
  createId,
  loadTransactions,
  saveTransactions,
} from "../lib/storage";
import type { Transaction, TransactionInput } from "../types/transaction";
import { TransactionsContext } from "./transactionsContext";

function normalize(input: TransactionInput): TransactionInput {
  return {
    ...input,
    amount: Math.round(input.amount * 100) / 100,
    description: input.description.trim(),
  };
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState(loadTransactions);
  const current = useRef(transactions);

  // Persist before updating state so a failed write (e.g. quota) never
  // shows data that wasn't saved. Callers surface the thrown error.
  const commit = useCallback((next: Transaction[]) => {
    saveTransactions(next);
    current.current = next;
    setTransactions(next);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = loadTransactions();
      current.current = next;
      setTransactions(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addTransaction = useCallback(
    (input: TransactionInput) => {
      const now = new Date().toISOString();
      const tx: Transaction = {
        ...normalize(input),
        id: createId(),
        createdAt: now,
        updatedAt: now,
      };
      commit([...current.current, tx]);
      return tx;
    },
    [commit],
  );

  const updateTransaction = useCallback(
    (id: string, input: TransactionInput) => {
      const existing = current.current.find((tx) => tx.id === id);
      if (!existing) throw new Error("Transaction no longer exists");
      const updated: Transaction = {
        ...existing,
        ...normalize(input),
        updatedAt: new Date().toISOString(),
      };
      commit(current.current.map((tx) => (tx.id === id ? updated : tx)));
      return updated;
    },
    [commit],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      commit(current.current.filter((tx) => tx.id !== id));
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
    }),
    [transactions, addTransaction, updateTransaction, deleteTransaction],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}
