import { formatCurrency } from "../lib/format";
import type { CategoryTotal } from "../lib/transactions";
import type { TransactionType } from "../types/transaction";

interface CategoryBreakdownProps {
  type: TransactionType;
  rows: CategoryTotal[];
}

const percent = new Intl.NumberFormat("en-PH", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Ranked horizontal bars: one row per category, largest first. */
export function CategoryBreakdown({ type, rows }: CategoryBreakdownProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted">
        No {type === "income" ? "income" : "expenses"} recorded yet.
      </p>
    );
  }

  const largest = rows[0]?.total ?? 0;
  const barColor = type === "income" ? "bg-brand" : "bg-expense";

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.category}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{row.category}</span>
            <span className="shrink-0 tabular-nums">
              {formatCurrency(row.total)}
              <span className="ml-2 text-muted">
                {percent.format(row.share)}
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-canvas" aria-hidden>
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{
                width: `${largest > 0 ? Math.max((row.total / largest) * 100, 1) : 0}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
