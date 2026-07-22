import { describe, expect, it } from "vitest";
import {
  localParts,
  medicationDayKey,
  nextReminder,
  reminderSlot,
  windowEnded,
  type LocalParts,
} from "../src/shared/time";
const p = (
  hour: number,
  minute: number,
  year = 2026,
  month = 7,
  day = 22,
): LocalParts => ({ year, month, day, hour, minute });
describe("medication day", () => {
  it.each([
    [3, 0, "2026-07-21"],
    [6, 59, "2026-07-21"],
    [7, 0, "2026-07-22"],
    [7, 1, "2026-07-22"],
  ])("%s:%s", (h, m, k) =>
    expect(medicationDayKey(p(h as number, m as number))).toBe(k),
  );
  it("crosses month and year", () => {
    expect(medicationDayKey(p(1, 0, 2026, 1, 1))).toBe("2025-12-31");
    expect(medicationDayKey(p(2, 0, 2026, 8, 1))).toBe("2026-07-31");
  });
});
describe("slots", () => {
  it.each([
    [21, 59, false],
    [22, 0, true],
    [22, 29, false],
    [22, 30, true],
    [23, 30, true],
    [23, 59, false],
    [0, 0, true],
    [0, 30, true],
    [1, 0, true],
    [3, 30, true],
    [4, 0, true],
    [4, 1, false],
    [6, 59, false],
    [7, 0, false],
  ])("%s:%s", (h, m, yes) =>
    expect(Boolean(reminderSlot(p(h as number, m as number)))).toBe(yes),
  );
  it("normalizes a slot", () =>
    expect(reminderSlot(p(0, 30))).toBe("2026-07-21@00:30"));
});
describe("display schedule", () => {
  it("finds next reminders and ended window", () => {
    expect(nextReminder(p(21, 59))).toBe("22:00");
    expect(nextReminder(p(23, 59))).toBe("00:00");
    expect(windowEnded(p(4, 1))).toBe(true);
    expect(windowEnded(p(7, 0))).toBe(false);
  });
});
describe("Pacific conversion", () => {
  it("handles spring DST transition", () => {
    expect(localParts(new Date("2026-03-08T09:59:00Z")).hour).toBe(1);
    expect(localParts(new Date("2026-03-08T10:00:00Z")).hour).toBe(3);
  });
  it("handles both fall occurrences", () => {
    expect(localParts(new Date("2026-11-01T08:30:00Z")).hour).toBe(1);
    expect(localParts(new Date("2026-11-01T09:30:00Z")).hour).toBe(1);
  });
});
