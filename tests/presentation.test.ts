import { describe, expect, it } from "vitest";
import {
  defaultSelectedDate,
  filterHistoryDays,
  nextStreakMilestone,
  shortHistoryStatus,
  statisticsDashboard,
  todaySummary,
} from "../src/client/presentation";
import type { DaySummary } from "../src/shared/domain";

const days = [
  { day: "2026-07-01", status: "none", doses: [] },
  {
    day: "2026-07-20",
    status: "taken",
    doses: [{ id: "required", taken: true }],
  },
  {
    day: "2026-07-21",
    status: "missed",
    doses: [{ id: "required", taken: false }],
  },
];

describe("history presentation", () => {
  it("selects today, then the latest visible day, then the first month day", () => {
    expect(defaultSelectedDate(days, "2026-07", "2026-07-21")).toBe(
      "2026-07-21",
    );
    expect(defaultSelectedDate(days.slice(0, 2), "2026-07", "2026-08-01")).toBe(
      "2026-07-20",
    );
    expect(defaultSelectedDate([], "2026-07", "2026-08-01")).toBe("2026-07-01");
  });
  it("filters the calendar by completion and medication", () => {
    expect(filterHistoryDays(days, "2026-07", "taken", "required")).toEqual([
      days[1],
    ]);
  });
  it("abbreviates no schedule without changing its accessible meaning", () => {
    expect(shortHistoryStatus("none")).toBe("—");
  });
});

describe("today presentation", () => {
  it("uses the server-provided next reminder in an overnight window", () => {
    expect(
      todaySummary({
        status: "open",
        remindersEnabled: true,
        nextReminder: "10:30 PM",
      }).reminder,
    ).toBe("10:30 PM");
  });
  it("suppresses later reminder text after completion", () => {
    expect(
      todaySummary({
        status: "taken",
        remindersEnabled: true,
        nextReminder: null,
      }).reminder,
    ).toContain("stopped");
  });
  it("reports disabled reminders", () => {
    expect(
      todaySummary({
        status: "open",
        remindersEnabled: false,
        nextReminder: "10:00 PM",
      }).reminder,
    ).toBe("Reminders are disabled.");
  });
});

describe("statistics periods", () => {
  const statisticsDays: DaySummary[] = [
    {
      day: "2026-06-30",
      status: "missed",
      required: 1,
      takenRequired: 0,
    },
    {
      day: "2026-07-20",
      status: "taken",
      required: 1,
      takenRequired: 1,
    },
    {
      day: "2026-07-21",
      status: "taken",
      required: 1,
      takenRequired: 1,
    },
  ];
  it.each([
    "current-month",
    "previous-30",
    "previous-90",
    "this-year",
    "all-time",
  ] as const)("calculates %s from the same daily summaries", (period) => {
    const result = statisticsDashboard(statisticsDays, period, "2026-07-21");
    expect(result.selected.every((day) => day.day <= "2026-07-21")).toBe(true);
    expect(Number.isFinite(result.stats.adherencePercent)).toBe(true);
  });
  it("compares against the previous equivalent period when data exists", () => {
    expect(
      statisticsDashboard(statisticsDays, "current-month", "2026-07-21").change,
    ).toBe(100);
    expect(
      statisticsDashboard(statisticsDays, "all-time", "2026-07-21").change,
    ).toBeNull();
  });
  it("chooses the next useful streak milestone", () => {
    expect(nextStreakMilestone(7)).toBe(10);
  });
});
