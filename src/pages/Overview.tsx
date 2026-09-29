import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FiPlus } from "react-icons/fi";
import {
  HiArrowDown,
  HiArrowUp,
  HiChevronLeft,
  HiChevronRight,
  HiExclamation,
} from "react-icons/hi";
import { Link, useSearchParams } from "react-router";
import { CategoryBreakdown } from "../components/CategoryBreakdown";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useLayoutContext } from "../components/useLayoutContext";
import { formatCurrency } from "../lib/format";
import {
  addMonths,
  currentMonthKey,
  formatMonth,
  formatShortMonth,
  isMonthKey,
  type MonthKey,
} from "../lib/month";
import {
  getBudgetProgress,
  getCategoryTotals,
  getMonthRange,
  getMonthSummary,
  inMonth,
  percentChange,
  type BudgetProgress,
} from "../lib/transactions";
import { useAppData } from "../state/useAppData";
import { TRANSACTION_TYPES, type TransactionType } from "../types/transaction";

const TAB_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expenses",
};

const percent = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 0,
});

export default function Overview() {
  const { data } = useAppData();
  const { transactions, budgets } = data;
  const { openAddTransaction } = useLayoutContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TransactionType>("expense");
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

  const thisMonth = currentMonthKey();
  const range = getMonthRange(transactions)!;
  const minMonth = range.first < thisMonth ? range.first : thisMonth;
  const maxMonth = range.last > thisMonth ? range.last : thisMonth;
  const requested = searchParams.get("month");
  const month: MonthKey =
    isMonthKey(requested) && requested >= minMonth && requested <= maxMonth
      ? requested
      : thisMonth;

  const goTo = (next: MonthKey) =>
    setSearchParams(next === thisMonth ? {} : { month: next }, {
      replace: true,
    });

  const monthTransactions = inMonth(transactions, month);
  const { current, previous } = getMonthSummary(transactions, month);
  const previousLabel = formatShortMonth(addMonths(month, -1));
  const cards = [
    {
      label: "Income",
      value: current.income,
      change: percentChange(current.income, previous?.income),
      tone: "text-brand",
    },
    {
      label: "Expenses",
      value: current.expense,
      change: percentChange(current.expense, previous?.expense),
      tone: "text-expense",
    },
    {
      label: "Net",
      value: current.savings,
      change: null,
      tone: current.savings < 0 ? "text-expense" : "text-ink",
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
        description="Your budget report for the month."
      />

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          className="icon-btn border border-line bg-surface"
          onClick={() => goTo(addMonths(month, -1))}
          disabled={month <= minMonth}
          aria-label="Previous month"
        >
          <HiChevronLeft aria-hidden size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center sm:flex-none sm:px-2">
          <h2
            className="text-base font-semibold whitespace-nowrap"
            aria-live="polite"
          >
            {formatMonth(month)}
          </h2>
          {month !== thisMonth && (
            <button
              type="button"
              className="text-xs font-medium text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => goTo(thisMonth)}
            >
              Back to this month
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-btn border border-line bg-surface"
          onClick={() => goTo(addMonths(month, 1))}
          disabled={month >= maxMonth}
          aria-label="Next month"
        >
          <HiChevronRight aria-hidden size={20} />
        </button>
      </div>

      <dl className="mb-6 grid grid-cols-1 divide-y divide-line rounded-lg border border-line bg-surface sm:grid-cols-3 sm:gap-3 sm:divide-y-0 sm:rounded-none sm:border-0 sm:bg-transparent">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-baseline justify-between gap-3 px-4 py-3 sm:block sm:rounded-lg sm:border sm:border-line sm:bg-surface"
          >
            <dt className="text-sm text-muted">{card.label}</dt>
            <dd className="text-right sm:mt-1 sm:text-left">
              <span
                className={`font-semibold tabular-nums sm:text-lg ${card.tone}`}
              >
                {formatCurrency(card.value)}
              </span>
              {card.change !== null && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted sm:ml-0 sm:flex">
                  {card.change >= 0 ? (
                    <HiArrowUp aria-hidden size={12} />
                  ) : (
                    <HiArrowDown aria-hidden size={12} />
                  )}
                  <span className="sr-only">
                    {card.change >= 0 ? "Up" : "Down"}
                  </span>
                  {percent.format(Math.abs(card.change))} vs {previousLabel}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <BudgetsSection
        progress={getBudgetProgress(transactions, budgets, month)}
      />

      <section className="rounded-lg border border-line bg-surface">
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
            <h3 className="sr-only">
              {TAB_LABELS[type]} by category, {formatMonth(month)}
            </h3>
            <CategoryBreakdown
              type={type}
              rows={getCategoryTotals(monthTransactions, type)}
            />
          </div>
        ))}
      </section>
    </>
  );
}

function BudgetsSection({ progress }: { progress: BudgetProgress[] }) {
  if (progress.length === 0) {
    return (
      <p className="mb-6 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">
        Set monthly limits for your spending categories on the{" "}
        <Link to="/plan" className="font-medium text-brand hover:underline">
          Plan
        </Link>{" "}
        page.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="budgets-heading"
      className="mb-6 rounded-lg border border-line bg-surface p-4 md:p-6"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 id="budgets-heading" className="font-semibold">
          Budgets
        </h3>
        <Link
          to="/plan"
          className="text-sm font-medium text-brand hover:underline"
        >
          Manage
        </Link>
      </div>
      <ul className="flex flex-col gap-4">
        {progress.map((budget) => {
          const over = budget.remaining < 0;
          return (
            <li key={budget.category}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="min-w-0 font-medium break-words">
                  {budget.category}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(budget.spent)}{" "}
                  <span className="text-muted">
                    of {formatCurrency(budget.limit)}
                  </span>
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas"
                role="progressbar"
                aria-label={`${budget.category} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(budget.ratio, 1) * 100)}
              >
                <div
                  className={`h-full rounded-full ${over ? "bg-expense" : "bg-brand"}`}
                  style={{ width: `${Math.min(budget.ratio, 1) * 100}%` }}
                />
              </div>
              <p
                className={`mt-1 flex items-center gap-1 text-xs ${over ? "font-medium text-expense" : "text-muted"}`}
              >
                {over && <HiExclamation aria-hidden size={14} />}
                {over
                  ? `Over by ${formatCurrency(-budget.remaining)}`
                  : `${formatCurrency(budget.remaining)} left`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
