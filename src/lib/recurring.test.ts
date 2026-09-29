import { EMPTY_DATA, type RecurringRule } from "../types/transaction";
import { applyRecurring, describeSchedule, nextOccurrence } from "./recurring";

let n = 0;
const ids = () => `id-${++n}`;

function rule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "rent",
    type: "expense",
    category: "Rentals",
    amount: 12000,
    description: "Rent",
    dayOfMonth: 5,
    startDate: "2026-07-01",
    generatedThrough: null,
    active: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const data = (r: RecurringRule) => ({ ...EMPTY_DATA, recurring: [r] });

describe("applyRecurring", () => {
  it("creates every due occurrence up to today, inclusive", () => {
    const next = applyRecurring(data(rule()), "2026-09-05", ids);
    expect(next.transactions.map((tx) => tx.date)).toEqual([
      "2026-07-05",
      "2026-08-05",
      "2026-09-05",
    ]);
    expect(next.transactions[0]).toMatchObject({
      category: "Rentals",
      amount: 12000,
      recurringId: "rent",
    });
    expect(next.recurring[0]!.generatedThrough).toBe("2026-09");
  });

  it("does not create this month's occurrence before its day", () => {
    const next = applyRecurring(data(rule()), "2026-09-04", ids);
    expect(next.transactions.map((tx) => tx.date)).toEqual([
      "2026-07-05",
      "2026-08-05",
    ]);
    expect(next.recurring[0]!.generatedThrough).toBe("2026-08");
  });

  it("is idempotent and returns the same object when nothing is due", () => {
    const once = applyRecurring(data(rule()), "2026-09-10", ids);
    expect(applyRecurring(once, "2026-09-10", ids)).toBe(once);
  });

  it("never recreates an occurrence the user deleted", () => {
    const once = applyRecurring(data(rule()), "2026-08-10", ids);
    const deleted = { ...once, transactions: once.transactions.slice(1) };
    const again = applyRecurring(deleted, "2026-08-20", ids);
    expect(again.transactions.map((tx) => tx.date)).toEqual(["2026-08-05"]);
  });

  it("skips dates before the start date", () => {
    const next = applyRecurring(
      data(rule({ startDate: "2026-07-10" })),
      "2026-08-10",
      ids,
    );
    expect(next.transactions.map((tx) => tx.date)).toEqual(["2026-08-05"]);
  });

  it("uses the last day in shorter months", () => {
    const next = applyRecurring(
      data(rule({ dayOfMonth: 31, startDate: "2026-01-01" })),
      "2026-03-31",
      ids,
    );
    expect(next.transactions.map((tx) => tx.date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("ignores paused rules", () => {
    const paused = data(rule({ active: false }));
    expect(applyRecurring(paused, "2026-12-31", ids)).toBe(paused);
  });
});

describe("nextOccurrence", () => {
  it("returns the next unhandled date, respecting the start date", () => {
    expect(nextOccurrence(rule({ generatedThrough: "2026-09" }))).toBe(
      "2026-10-05",
    );
    expect(nextOccurrence(rule({ startDate: "2026-07-20" }))).toBe(
      "2026-08-05",
    );
    expect(
      nextOccurrence(
        rule({ generatedThrough: "2026-01", startDate: "2026-06-01" }),
      ),
    ).toBe("2026-06-05");
    expect(nextOccurrence(rule({ active: false }))).toBeNull();
  });

  it("describes the schedule", () => {
    expect(describeSchedule({ dayOfMonth: 1 })).toBe("Monthly on the 1st");
    expect(describeSchedule({ dayOfMonth: 12 })).toBe("Monthly on the 12th");
    expect(describeSchedule({ dayOfMonth: 22 })).toBe("Monthly on the 22nd");
    expect(describeSchedule({ dayOfMonth: 31 })).toBe(
      "Monthly on the 31st (or the last day)",
    );
  });
});
