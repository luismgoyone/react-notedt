import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as ops from "../lib/appData";
import { toISODate } from "../lib/format";
import { applyRecurring } from "../lib/recurring";
import {
  STORAGE_KEY,
  createId,
  loadAppData,
  saveAppData,
} from "../lib/storage";
import type { AppData } from "../types/transaction";
import { AppDataContext, type AppDataContextValue } from "./appDataContext";

const today = () => toISODate(new Date());

/** Loads saved data and creates any recurring transactions that are due. */
function loadCurrent(): AppData {
  const loaded = loadAppData();
  const withRecurring = applyRecurring(loaded, today(), createId);
  if (withRecurring !== loaded) saveAppData(withRecurring);
  return withRecurring;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(loadCurrent);
  const current = useRef(data);

  // Persist before updating state so a failed write (e.g. quota) never
  // shows data that wasn't saved. Callers surface the thrown error.
  const commit = useCallback((next: AppData) => {
    const withRecurring = applyRecurring(next, today(), createId);
    saveAppData(withRecurring);
    current.current = withRecurring;
    setData(withRecurring);
  }, []);

  const reload = useCallback(() => {
    const next = loadCurrent();
    current.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    // Another tab changed the data.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) reload();
    };
    // Coming back to the app on a later day may make recurring items due.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const next = applyRecurring(current.current, today(), createId);
        if (next !== current.current) commit(next);
      }
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [commit, reload]);

  const actions = useMemo(() => {
    const now = () => new Date().toISOString();
    const get = () => current.current;
    const value: Omit<AppDataContextValue, "data"> = {
      addTransaction: (input) => {
        const result = ops.addTransactions(get(), [input], createId, now());
        commit(result.data);
        return result.created[0]!;
      },
      updateTransaction: (id, input) => {
        const result = ops.updateTransaction(get(), id, input, now());
        commit(result.data);
        return result.updated;
      },
      deleteTransaction: (id) => {
        const removed = get().transactions.find((tx) => tx.id === id);
        commit(ops.removeTransaction(get(), id));
        return removed;
      },
      restoreTransaction: (tx) => commit(ops.restoreTransaction(get(), tx)),
      importTransactions: (inputs) => {
        commit(ops.addTransactions(get(), inputs, createId, now()).data);
        return inputs.length;
      },
      replaceData: (next) => commit(next),
      addCategory: (type, name) =>
        commit(ops.addCategory(get(), type, name, createId).data),
      renameCategory: (id, name) => commit(ops.renameCategory(get(), id, name)),
      deleteCategory: (id) => commit(ops.removeCategory(get(), id)),
      setBudget: (category, limit) =>
        commit(ops.setBudget(get(), category, limit)),
      deleteBudget: (category) => commit(ops.removeBudget(get(), category)),
      addRecurring: (input) =>
        commit(ops.addRecurring(get(), input, createId, now()).data),
      updateRecurring: (id, input) =>
        commit(ops.updateRecurring(get(), id, input)),
      setRecurringActive: (id, active) =>
        commit(ops.setRecurringActive(get(), id, active, today())),
      deleteRecurring: (id) => {
        const removed = get().recurring.find((rule) => rule.id === id);
        commit(ops.removeRecurring(get(), id));
        return removed;
      },
      restoreRecurring: (rule) => commit(ops.restoreRecurring(get(), rule)),
    };
    return value;
  }, [commit]);

  const value = useMemo(() => ({ data, ...actions }), [data, actions]);

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}
