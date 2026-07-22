import { describe, expect, it } from "vitest";
import {
  adherence,
  automaticTimeZoneUpdate,
  classifyDay,
  completion,
  completionTimestamp,
  medicationDay,
  getMedicationDayKey,
  isValidTimeZone,
  nextSlotMinute,
  safeCsv,
  schedulePreview,
  scheduledSlot,
  scheduledSlotForInstant,
  slotOffset,
  zonedParts,
  type ScheduleSettings,
} from "../src/shared/domain";
const base: ScheduleSettings = {
  startMinute: 1320,
  endMinute: 240,
  intervalMinute: 30,
  timezone: "America/Los_Angeles",
  timeZoneMode: "automatic",
  remindersEnabled: true,
  completionMode: "group",
};
const p = (hour: number, minute: number, year = 2026, month = 7, day = 22) => ({
  year,
  month,
  day,
  hour,
  minute,
});
describe("configurable schedule", () => {
  it.each([
    [22, 0, true],
    [22, 30, true],
    [23, 30, true],
    [0, 0, true],
    [4, 0, true],
    [4, 1, false],
    [21, 59, false],
  ])("%s:%s", (h, m, due) =>
    expect(Boolean(scheduledSlot(p(h as number, m as number), base))).toBe(due),
  );
  it.each([10, 15, 20, 30, 45, 60] as const)(
    "supports %s minute intervals",
    (interval) =>
      expect(
        slotOffset(1320 + interval, {
          ...base,
          endMinute: 1439,
          intervalMinute: interval,
        }),
      ).toBe(interval),
  );
  it("supports non-crossing windows", () => {
    const s = { ...base, startMinute: 1200, endMinute: 1410 };
    expect(scheduledSlot(p(22, 30), s)).not.toBeNull();
    expect(scheduledSlot(p(0, 0), s)).toBeNull();
  });
  it("pauses reminders", () =>
    expect(
      scheduledSlot(p(22, 0), { ...base, remindersEnabled: false }),
    ).toBeNull());
  it("previews settings", () =>
    expect(schedulePreview(base)).toBe(
      "Reminders every 30 minutes from 10:00 PM until 4:00 AM.",
    ));
  it("finds the nearest upcoming slot across midnight", () => {
    expect(nextSlotMinute(21 * 60 + 59, base)).toBe(1320);
    expect(nextSlotMinute(23 * 60 + 59, base)).toBe(0);
    expect(nextSlotMinute(241, base)).toBe(1320);
    expect(
      nextSlotMinute(1320, { ...base, remindersEnabled: false }),
    ).toBeNull();
  });
});
describe("time zones", () => {
  it("keeps the 7am medication boundary", () => {
    expect(medicationDay(p(6, 59))).toBe("2026-07-21");
    expect(medicationDay(p(7, 0))).toBe("2026-07-22");
  });
  it("handles spring and fall DST", () => {
    expect(
      zonedParts(new Date("2026-03-08T10:00:00Z"), base.timezone).hour,
    ).toBe(3);
    expect(
      zonedParts(new Date("2026-11-01T08:30:00Z"), base.timezone).hour,
    ).toBe(1);
    expect(
      zonedParts(new Date("2026-11-01T09:30:00Z"), base.timezone).hour,
    ).toBe(1);
  });
  it.each([
    ["2026-01-02T06:00:00Z", "America/Los_Angeles", "2026-01-01@22:00"],
    ["2026-07-02T05:00:00Z", "America/Los_Angeles", "2026-07-01@22:00"],
    ["2026-01-02T03:00:00Z", "America/New_York", "2026-01-01@22:00"],
    ["2026-01-01T14:00:00Z", "Asia/Shanghai", "2026-01-01@22:00"],
  ])("maps %s into %s", (instant, timezone, expected) => {
    const settings = { ...base, timezone };
    expect(scheduledSlotForInstant(new Date(instant), settings)).toBe(
      `${expected}|${timezone}`,
    );
  });
  it("maps overnight instants to the prior medication day", () => {
    expect(
      getMedicationDayKey(
        new Date("2026-07-22T08:00:00Z"),
        "America/Los_Angeles",
      ),
    ).toBe("2026-07-21");
  });
  it("deduplicates both fall-back occurrences by intended local slot", () => {
    const settings = { ...base, startMinute: 60, endMinute: 60 };
    expect(
      scheduledSlotForInstant(new Date("2026-11-01T08:00:00Z"), settings),
    ).toBe(scheduledSlotForInstant(new Date("2026-11-01T09:00:00Z"), settings));
  });
  it("uses the intended slot when Cron arrives a few minutes late", () => {
    expect(
      scheduledSlotForInstant(new Date("2026-07-02T05:03:00Z"), base),
    ).toBe("2026-07-01@22:00|America/Los_Angeles");
  });
  it("validates canonical IANA identifiers", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("PST")).toBe(false);
    expect(isValidTimeZone("not/a-zone")).toBe(false);
  });
  it("updates automatic mode but never overwrites manual mode", () => {
    expect(
      automaticTimeZoneUpdate(
        "automatic",
        "America/Los_Angeles",
        "America/New_York",
      ),
    ).toBe("America/New_York");
    expect(
      automaticTimeZoneUpdate(
        "manual",
        "America/Los_Angeles",
        "America/New_York",
      ),
    ).toBeNull();
  });
});
describe("completion and statistics", () => {
  it("uses the latest state-change time for an existing group completion", () => {
    expect(
      completionTimestamp(
        true,
        "2026-07-21T22:09:00.611Z",
        "2026-07-22T06:09:00.611Z",
        [],
      ),
    ).toBe("2026-07-22T06:09:00.611Z");
  });
  it("keeps the stored completion time for legacy records without change metadata", () => {
    expect(
      completionTimestamp(true, "2026-07-21T22:09:00.611Z", null, []),
    ).toBe("2026-07-21T22:09:00.611Z");
  });
  it("ignores stale legacy times when only individual doses are taken", () => {
    expect(
      completionTimestamp(
        false,
        "2026-07-21T22:09:00.611Z",
        "2026-07-22T06:09:00.611Z",
        ["2026-07-22T05:30:00.000Z", "2026-07-22T06:10:00.000Z"],
      ),
    ).toBe("2026-07-22T06:10:00.000Z");
  });
  it("handles group, individual and optional doses", () => {
    const doses = [
      { required: true, taken: true },
      { required: true, taken: false },
      { required: false, taken: false },
    ];
    expect(completion(doses, "group")).toBe("not-taken");
    expect(completion(doses, "individual")).toBe("partial");
    expect(completion([{ required: false, taken: false }], "individual")).toBe(
      "none",
    );
  });
  it("does not mark an open day missed", () =>
    expect(
      classifyDay(
        "2026-07-21",
        "2026-07-21",
        true,
        [{ required: true, taken: false }],
        "group",
      ),
    ).toBe("open"));
  it("classifies future, missed, partial, and legacy-complete days", () => {
    const doses = [{ required: true, taken: false }];
    expect(classifyDay("2026-07-22", "2026-07-21", false, doses, "group")).toBe(
      "future",
    );
    expect(classifyDay("2026-07-20", "2026-07-21", false, doses, "group")).toBe(
      "missed",
    );
    expect(
      classifyDay(
        "2026-07-20",
        "2026-07-21",
        false,
        [
          { required: true, taken: true },
          { required: true, taken: false },
        ],
        "individual",
      ),
    ).toBe("partial");
    expect(
      classifyDay("2026-07-20", "2026-07-21", false, doses, "group", true),
    ).toBe("taken");
  });
  it("calculates adherence and streaks without NaN", () => {
    expect(adherence([]).adherencePercent).toBe(0);
    expect(
      adherence([
        { day: "1", status: "taken", required: 2, takenRequired: 2 },
        { day: "2", status: "partial", required: 2, takenRequired: 1 },
        { day: "3", status: "taken", required: 2, takenRequired: 2 },
      ]),
    ).toMatchObject({
      adherencePercent: 83,
      currentStreak: 1,
      longestStreak: 1,
      takenDays: 2,
      partialDays: 1,
    });
  });
  it("escapes CSV formula-safe content structurally", () =>
    expect(safeCsv('note, "quoted"')).toBe('"note, ""quoted"""'));
  it("neutralizes spreadsheet formulas", () =>
    expect(safeCsv("=1+1")).toBe("'=1+1"));
});
