import type { AppData, RecurringRule, Transaction } from "../types/transaction";
import { addMonths, dateInMonth, toMonthKey } from "./month";

type IdFactory = () => string;

/**
 * Creates the transactions each active rule owes up to `today` (inclusive).
 * A rule remembers the last month it handled, so occurrences are created
 * once and a deleted occurrence is never recreated. Returns the same object
 * when nothing is due.
 */
export function applyRecurring(
  data: AppData,
  today: string,
  createId: IdFactory,
  now = new Date().toISOString(),
): AppData {
  const created: Transaction[] = [];
  let changed = false;

  const recurring = data.recurring.map((rule) => {
    if (!rule.active) return rule;
    const currentMonth = toMonthKey(today);
    let month = rule.generatedThrough
      ? addMonths(rule.generatedThrough, 1)
      : toMonthKey(rule.startDate);
    let generatedThrough = rule.generatedThrough;

    while (month <= currentMonth) {
      const date = dateInMonth(month, rule.dayOfMonth);
      if (date > today) break;
      if (date >= rule.startDate) {
        created.push({
          id: createId(),
          type: rule.type,
          category: rule.category,
          amount: rule.amount,
          date,
          description: rule.description,
          createdAt: now,
          updatedAt: now,
          recurringId: rule.id,
        });
      }
      generatedThrough = month;
      month = addMonths(month, 1);
    }

    if (generatedThrough === rule.generatedThrough) return rule;
    changed = true;
    return { ...rule, generatedThrough };
  });

  if (!changed) return data;
  return {
    ...data,
    recurring,
    transactions: [...data.transactions, ...created],
  };
}

/**
 * The next date this rule will create a transaction, or null if paused.
 * Assumes `applyRecurring` has already created everything due.
 */
export function nextOccurrence(rule: RecurringRule) {
  if (!rule.active) return null;
  const startMonth = toMonthKey(rule.startDate);
  const nextUnhandled = rule.generatedThrough
    ? addMonths(rule.generatedThrough, 1)
    : startMonth;
  let month = nextUnhandled > startMonth ? nextUnhandled : startMonth;
  // Within the start month the day may fall before the start date.
  let date = dateInMonth(month, rule.dayOfMonth);
  if (date < rule.startDate) {
    month = addMonths(month, 1);
    date = dateInMonth(month, rule.dayOfMonth);
  }
  return date;
}

export function describeSchedule(rule: Pick<RecurringRule, "dayOfMonth">) {
  const day = rule.dayOfMonth;
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return day >= 29
    ? `Monthly on the ${day}${suffix} (or the last day)`
    : `Monthly on the ${day}${suffix}`;
}
