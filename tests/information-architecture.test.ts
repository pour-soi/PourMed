import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("src/client/index.html", "utf8");
const client = readFileSync("src/client/main.ts", "utf8");
const css = readFileSync("src/client/style.css", "utf8");

describe("history information architecture", () => {
  it("uses one calendar and one inline selected-day detail", () => {
    expect(html).toContain('id="calendar"');
    expect(html).toContain('id="selected-day"');
    expect(html).not.toContain('id="history-list"');
    expect(html).not.toContain('id="day-dialog"');
    expect(client).toContain("cell.onclick = () => selectDay(d.day)");
    expect(client).toContain("renderSelectedDay(");
    expect(client).toContain('"Reminder window"');
    expect(client).toContain('"Taken at"');
  });
  it("keeps filters and exposes accessible selected calendar cells", () => {
    expect(html).toContain('id="history-filter"');
    expect(html).toContain('id="medication-filter"');
    expect(client).toContain("filterHistoryDays(");
    expect(client).toContain('"aria-label"');
    expect(client).toContain('cell.setAttribute("aria-selected"');
    expect(css).toContain('.calendar button[aria-selected="true"]');
    expect(css).toContain("text-overflow: ellipsis");
  });
});

describe("settings and today organization", () => {
  it("orders daily settings before one advanced section", () => {
    const schedule = html.indexOf('id="schedule-heading"');
    const notifications = html.indexOf('id="notifications-heading"');
    const appearance = html.indexOf('id="appearance-heading"');
    const advanced = html.indexOf('id="advanced-settings"');
    expect(schedule).toBeGreaterThan(0);
    expect(schedule).toBeLessThan(notifications);
    expect(notifications).toBeLessThan(appearance);
    expect(appearance).toBeLessThan(advanced);
    for (const id of ["start-time", "end-time", "interval", "timezone"])
      expect(html.match(new RegExp(`id="${id}"`, "g"))).toHaveLength(1);
  });
  it("shows the authoritative medication-day reminder summary", () => {
    for (const id of [
      "today-summary-day",
      "today-summary-status",
      "today-summary-next",
      "today-summary-interval",
      "today-summary-end",
    ])
      expect(html).toContain(`id="${id}"`);
    expect(client).toContain("app.nextReminder");
    expect(client).toContain("app.reminderEnd");
  });
});
