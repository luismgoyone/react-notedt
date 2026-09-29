import { useState } from "react";
import { BsArrowRepeat } from "react-icons/bs";
import { FiPlus } from "react-icons/fi";
import {
  HiOutlineAdjustments,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { EmptyState } from "../components/EmptyState";
import { FilterModal } from "../components/FilterModal";
import { PageHeader } from "../components/PageHeader";
import { SearchBar } from "../components/SearchBar";
import { TransactionFormModal } from "../components/TransactionFormModal";
import { useLayoutContext } from "../components/useLayoutContext";
import { TYPE_LABELS } from "../lib/categories";
import { formatCurrency, formatDate } from "../lib/format";
import {
  countActiveFilters,
  matchesFilters,
  matchesSearch,
  sortTransactions,
} from "../lib/transactions";
import { useToast } from "../state/useToast";
import { useAppData } from "../state/useAppData";
import {
  EMPTY_FILTERS,
  type Transaction,
  type TransactionFilters,
} from "../types/transaction";

export default function Transactions() {
  const {
    data: { transactions },
    deleteTransaction,
    restoreTransaction,
  } = useAppData();
  const { openAddTransaction } = useLayoutContext();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions"
        description="You don't have any transactions yet. Add one to start tracking your budget."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={openAddTransaction}
          >
            <FiPlus aria-hidden size={18} />
            Add transaction
          </button>
        }
      />
    );
  }

  const activeFilterCount = countActiveFilters(filters);
  const visible = sortTransactions(transactions).filter(
    (tx) => matchesFilters(tx, filters) && matchesSearch(tx, search),
  );
  const isNarrowed = search.trim() !== "" || activeFilterCount > 0;
  const clearAll = () => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
  };

  const onDelete = (tx: Transaction) => {
    try {
      const removed = deleteTransaction(tx.id);
      if (!removed) return;
      showToast(`Deleted ${removed.category}`, {
        action: {
          label: "Undo",
          onClick: () => {
            try {
              restoreTransaction(removed);
            } catch {
              showToast("Couldn't restore the transaction.", "error");
            }
          },
        },
      });
    } catch {
      showToast("Couldn't delete the transaction. Please try again.", "error");
    }
  };

  return (
    <>
      <PageHeader title="Transaction details" />

      <div className="mb-4 flex gap-2">
        <SearchBar value={search} onChange={setSearch} />
        <button
          type="button"
          className="btn-secondary relative shrink-0 px-3"
          onClick={() => setFiltersOpen(true)}
          aria-label={
            activeFilterCount > 0
              ? `Filters (${activeFilterCount} active)`
              : "Filters"
          }
        >
          <HiOutlineAdjustments aria-hidden size={20} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span
              aria-hidden
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-brand text-xs text-on-brand"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {isNarrowed && (
        <p
          className="mb-3 flex flex-wrap items-center gap-x-3 text-sm text-muted"
          aria-live="polite"
        >
          Showing {visible.length} of {transactions.length} transactions
          <button
            type="button"
            className="font-medium text-brand underline-offset-2 hover:underline"
            onClick={clearAll}
          >
            Clear search &amp; filters
          </button>
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description="No transactions match your search or filters. Try something different."
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {visible.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onEdit={() => setEditing(tx)}
              onDelete={() => onDelete(tx)}
            />
          ))}
        </ul>
      )}

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
      />
      <TransactionFormModal
        open={editing !== null}
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function TransactionRow({
  transaction: tx,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = tx.type === "income";
  const label = `${tx.category}, ${formatCurrency(tx.amount)} on ${formatDate(tx.date)}`;
  return (
    <li className="flex items-start gap-3 px-4 py-4">
      <span
        aria-hidden
        className={`mt-1.5 size-3 shrink-0 rounded-full ${isIncome ? "bg-brand" : "bg-expense"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">
          {tx.category}
          {tx.recurringId && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-normal text-muted">
              <BsArrowRepeat aria-hidden size={12} />
              Recurring
            </span>
          )}
        </p>
        {tx.description && (
          <p className="mt-0.5 line-clamp-2 text-sm break-words text-muted">
            {tx.description}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">{formatDate(tx.date)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end sm:flex-row sm:items-center sm:gap-3">
        <p
          className={`font-semibold tabular-nums ${isIncome ? "text-brand" : "text-expense"}`}
        >
          <span className="sr-only">{TYPE_LABELS[tx.type]}: </span>
          {isIncome ? "+" : "−"}
          {formatCurrency(tx.amount)}
        </p>
        <div className="-mr-2 -mb-2 flex sm:-my-2">
          <button
            type="button"
            className="icon-btn"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
          >
            <HiOutlinePencil aria-hidden size={20} />
          </button>
          <button
            type="button"
            className="icon-btn hover:bg-expense-soft hover:text-expense"
            onClick={onDelete}
            aria-label={`Delete ${label}`}
          >
            <HiOutlineTrash aria-hidden size={20} />
          </button>
        </div>
      </div>
    </li>
  );
}
