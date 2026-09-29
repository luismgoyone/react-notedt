import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FiPlus } from "react-icons/fi";
import { CategoryBreakdown } from "../components/CategoryBreakdown";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useLayoutContext } from "../components/useLayoutContext";
import { formatCurrency } from "../lib/format";
import { getCategoryTotals, getTotals } from "../lib/transactions";
import { useTransactions } from "../state/useTransactions";
import { TRANSACTION_TYPES, type TransactionType } from "../types/transaction";

const TAB_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expenses",
};

export default function Overview() {
  const { transactions } = useTransactions();
  const { openAddTransaction } = useLayoutContext();
  const [activeTab, setActiveTab] = useState<TransactionType>("income");
  const tabRefs = useRef<Partial<Record<TransactionType, HTMLButtonElement>>>(
    {},
  );

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

  const totals = getTotals(transactions);
  const cards = [
    { label: "Income", value: totals.income, tone: "text-brand" },
    { label: "Expenses", value: totals.expense, tone: "text-expense" },
    {
      label: "Savings",
      value: totals.savings,
      tone: totals.savings < 0 ? "text-expense" : "text-ink",
    },
  ];

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = activeTab === "income" ? "expense" : "income";
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <PageHeader
        title="Transactions overview"
        description="View your budget report below."
      />

      <dl className="mb-6 grid grid-cols-1 divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-3 sm:gap-3 sm:divide-y-0 sm:rounded-none sm:border-0 sm:bg-transparent">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-baseline justify-between gap-3 px-4 py-3 sm:block sm:rounded-lg sm:border sm:border-line sm:bg-white"
          >
            <dt className="text-sm text-muted">{card.label}</dt>
            <dd
              className={`font-semibold tabular-nums sm:mt-1 sm:text-lg ${card.tone}`}
            >
              {formatCurrency(card.value)}
            </dd>
          </div>
        ))}
      </dl>

      <section className="rounded-lg border border-line bg-white">
        <div
          role="tablist"
          aria-label="Breakdown"
          className="flex border-b border-line"
        >
          {TRANSACTION_TYPES.map((type) => {
            const selected = activeTab === type;
            return (
              <button
                key={type}
                ref={(el) => {
                  if (el) tabRefs.current[type] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${type}`}
                aria-controls={`panel-${type}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(type)}
                onKeyDown={onTabKeyDown}
                className={`min-h-12 flex-1 border-b-2 px-4 text-sm font-medium uppercase transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                  selected
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:bg-canvas"
                }`}
              >
                {TAB_LABELS[type]}
              </button>
            );
          })}
        </div>
        {TRANSACTION_TYPES.map((type) => (
          <div
            key={type}
            role="tabpanel"
            id={`panel-${type}`}
            aria-labelledby={`tab-${type}`}
            hidden={activeTab !== type}
            className="p-4 md:p-6"
          >
            <h2 className="sr-only">{TAB_LABELS[type]} by category</h2>
            <CategoryBreakdown
              type={type}
              rows={getCategoryTotals(transactions, type)}
            />
          </div>
        ))}
      </section>
    </>
  );
}
