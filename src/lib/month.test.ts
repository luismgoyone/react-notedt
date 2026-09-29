import { addMonths, dateInMonth, formatMonth, isMonthKey } from "./month";

describe("month helpers", () => {
  it("adds months across year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("clamps days to the month length, including leap years", () => {
    expect(dateInMonth("2026-02", 30)).toBe("2026-02-28");
    expect(dateInMonth("2028-02", 30)).toBe("2028-02-29");
    expect(dateInMonth("2026-04", 5)).toBe("2026-04-05");
  });

  it("validates and formats month keys", () => {
    expect(isMonthKey("2026-09")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(formatMonth("2026-09")).toBe("September 2026");
  });
});
