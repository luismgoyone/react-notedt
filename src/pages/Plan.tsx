import { useState } from "react";
import type { ReactNode } from "react";
import { FiPlus } from "react-icons/fi";
import {
  HiOutlinePause,
  HiOutlinePencil,
  HiOutlinePlay,
  HiOutlineTrash,
} from "react-icons/hi";
import { BudgetFormModal } from "../components/BudgetFormModal";
import { PageHeader } from "../components/PageHeader";
import { RecurringFormModal } from "../components/RecurringFormModal";
import { formatCurrency, formatDate } from "../lib/format";
import { currentMonthKey } from "../lib/month";
import { describeSchedule, nextOccurrence } from "../lib/recurring";
import { getBudgetProgress } from "../lib/transactions";
import { useAppData } from "../state/useAppData";
import { useToast } from "../state/useToast";
import type { Budget, RecurringRule } from "../types/transaction";

export default function Plan() {
  return (
    <>
      <PageHeader
        title="Plan"
        description="Monthly budgets and transactions that repeat every month."
      />
      <div className="flex flex-col gap-6">
        <BudgetsCard />
        <RecurringCard />
      </div>
    </>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
      <div className="min-w-0">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function BudgetsCard() {
  const { data, setBudget, deleteBudget } = useAppData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [adding, setAdding] = useState(false);
  const progress = getBudgetProgress(
    data.transactions,
    data.budgets,
    currentMonthKey(),
  );

  const onDelete = (budget: Budget) => {
    try {
      deleteBudget(budget.category);
      showToast(`Removed the ${budget.category} budget`, {
        action: {
          label: "Undo",
          onClick: () => setBudget(budget.category, budget.limit),
        },
      });
    } catch {
      showToast("Couldn't remove the budget. Please try again.", "error");
    }
  };

  return (
    <section className="rounded-lg border border-line bg-surface">
      <SectionHeader
        title="Budgets"
        description="Monthly spending limits per expense category."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAdding(true)}
          >
            <FiPlus aria-hidden size={18} />
            Add budget
          </button>
        }
      />
      {progress.length === 0 ? (
        <p className="px-4 py-6 text-center text-muted md:px-6">
          No budgets yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {progress.map((budget) => (
            <li
              key={budget.category}
              className="flex items-center gap-3 px-4 py-3 md:px-6"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{budget.category}</p>
                <p className="text-sm text-muted tabular-nums">
                  {formatCurrency(budget.limit)} a month ·{" "}
                  {formatCurrency(budget.spent)} spent this month
                </p>
              </div>
              <div className="-mr-2 flex shrink-0">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setEditing(budget)}
                  aria-label={`Edit ${budget.category} budget`}
                >
                  <HiOutlinePencil aria-hidden size={20} />
                </button>
                <button
                  type="button"
                  className="icon-btn hover:bg-expense-soft hover:text-expense"
                  onClick={() => onDelete(budget)}
                  aria-label={`Remove ${budget.category} budget`}
                >
                  <HiOutlineTrash aria-hidden size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <BudgetFormModal
        open={adding || editing !== null}
        budget={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </section>
  );
}

function RecurringCard() {
  const { data, setRecurringActive, deleteRecurring, restoreRecurring } =
    useAppData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [adding, setAdding] = useState(false);
  const rules = [...data.recurring].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      a.dayOfMonth - b.dayOfMonth ||
      a.category.localeCompare(b.category),
  );

  const run = (action: () => void, failure: string) => {
    try {
      action();
    } catch {
      showToast(failure, "error");
    }
  };

  const onDelete = (rule: RecurringRule) =>
    run(() => {
      const removed = deleteRecurring(rule.id);
      if (!removed) return;
      showToast(`Stopped recurring ${removed.category}`, {
        action: { label: "Undo", onClick: () => restoreRecurring(removed) },
      });
    }, "Couldn't delete. Please try again.");

  return (
    <section className="rounded-lg border border-line bg-surface">
      <SectionHeader
        title="Recurring"
        description="Added automatically each month, like rent, bills, or salary."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAdding(true)}
          >
            <FiPlus aria-hidden size={18} />
            Add recurring
          </button>
        }
      />
      {rules.length === 0 ? (
        <p className="px-4 py-6 text-center text-muted md:px-6">
          No recurring transactions yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rules.map((rule) => {
            const next = nextOccurrence(rule);
            const isIncome = rule.type === "income";
            return (
              <li
                key={rule.id}
                className={`flex items-start gap-3 px-4 py-3 md:px-6 ${rule.active ? "" : "opacity-70"}`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 size-3 shrink-0 rounded-full ${isIncome ? "bg-brand" : "bg-expense"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">
                    {rule.category}{" "}
                    <span
                      className={`font-semibold whitespace-nowrap tabular-nums ${isIncome ? "text-brand" : "text-expense"}`}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(rule.amount)}
                    </span>
                  </p>
                  {rule.description && (
                    <p className="text-sm break-words text-muted">
                      {rule.description}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted">
                    {describeSchedule(rule)} ·{" "}
                    {next ? `Next: ${formatDate(next)}` : "Paused"}
                  </p>
                </div>
                <div className="-my-1 -mr-2 flex shrink-0 flex-wrap justify-end">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      run(
                        () => setRecurringActive(rule.id, !rule.active),
                        "Couldn't update. Please try again.",
                      )
                    }
                    aria-label={`${rule.active ? "Pause" : "Resume"} ${rule.category}`}
                  >
                    {rule.active ? (
                      <HiOutlinePause aria-hidden size={20} />
                    ) : (
                      <HiOutlinePlay aria-hidden size={20} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setEditing(rule)}
                    aria-label={`Edit ${rule.category}`}
                  >
                    <HiOutlinePencil aria-hidden size={20} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn hover:bg-expense-soft hover:text-expense"
                    onClick={() => onDelete(rule)}
                    aria-label={`Delete ${rule.category}`}
                  >
                    <HiOutlineTrash aria-hidden size={20} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <RecurringFormModal
        open={adding || editing !== null}
        rule={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </section>
  );
}
