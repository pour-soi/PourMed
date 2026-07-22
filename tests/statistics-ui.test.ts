import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("src/client/index.html", "utf8");
const client = readFileSync("src/client/main.ts", "utf8");
const css = readFileSync("src/client/style.css", "utf8");

describe("statistics dashboard", () => {
  it("offers every period in one selector and one card grid", () => {
    for (const value of [
      "current-month",
      "previous-30",
      "previous-90",
      "this-year",
      "all-time",
    ])
      expect(html).toContain(`value="${value}"`);
    expect(html.match(/id="stats-grid"/g)).toHaveLength(1);
    expect(client).toContain("statisticsData ??=");
  });
  it("renders cards in the requested stable order", () => {
    const adherence = client.indexOf('el("span", "Adherence")');
    const current = client.indexOf('["Current streak", "currentStreak"]');
    const longest = client.indexOf('["Longest streak", "longestStreak"]');
    const taken = client.indexOf('["Taken days", "takenDays"]');
    const missed = client.indexOf('["Missed days", "missedDays"]');
    const partial = client.indexOf('["Partial days", "partialDays"]');
    expect(adherence).toBeGreaterThan(0);
    expect(adherence).toBeLessThan(current);
    expect(current).toBeLessThan(longest);
    expect(longest).toBeLessThan(taken);
    expect(taken).toBeLessThan(missed);
    expect(missed).toBeLessThan(partial);
  });
  it("provides empty, consistency, timeline, and accessible states", () => {
    expect(html).toContain("No medication history yet.");
    expect(html).toContain('id="consistency-summary"');
    expect(html).toContain('id="stats-timeline"');
    expect(client).toContain('button.setAttribute("aria-label"');
    expect(client).toContain("openHistoryFromStatistics(day.day)");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("animation: stat-update");
  });
});
