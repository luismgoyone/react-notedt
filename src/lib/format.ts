const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

/** Formats a `YYYY-MM-DD` string without shifting it through UTC. */
export function formatDate(isoDate: string) {
  return dateFormatter.format(parseISODate(isoDate));
}

export function parseISODate(isoDate: string) {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return toISODate(parseISODate(value)) === value;
}
