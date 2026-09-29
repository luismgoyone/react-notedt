import { parseISODate, toISODate } from "./format";

/** Calendar month as `YYYY-MM`. */
export type MonthKey = string;

const monthFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});

const shortMonthFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
});

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function toMonthKey(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(today = new Date()): MonthKey {
  return toMonthKey(toISODate(today));
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const [year = 0, m = 1] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + count, 1);
  return toMonthKey(toISODate(date));
}

export function daysInMonth(month: MonthKey) {
  const [year = 0, m = 1] = month.split("-").map(Number);
  return new Date(year, m, 0).getDate();
}

/** The date `day` falls on in `month`, clamped to the month's last day. */
export function dateInMonth(month: MonthKey, day: number) {
  const clamped = Math.min(day, daysInMonth(month));
  return `${month}-${String(clamped).padStart(2, "0")}`;
}

export function formatMonth(month: MonthKey) {
  return monthFormatter.format(parseISODate(`${month}-01`));
}

export function formatShortMonth(month: MonthKey) {
  return shortMonthFormatter.format(parseISODate(`${month}-01`));
}
