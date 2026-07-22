import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  formatDateForLocale,
  initialLocale,
  translate,
  translationKeyDifferences,
  zh,
  type Message,
} from "../src/client/i18n";
import { getMedicationDayKey } from "../src/shared/domain";
import { notificationCopy } from "../src/shared/localization";

describe("localization", () => {
  it("uses English as the safe fallback", () => {
    expect(initialLocale(null, ["fr-FR"])).toBe("en");
    expect(initialLocale(null, ["zh-TW"])).toBe("en");
  });

  it("selects Simplified Chinese only for supported Chinese device locales", () => {
    expect(initialLocale(null, ["zh"])).toBe("zh-CN");
    expect(initialLocale(null, ["zh-CN"])).toBe("zh-CN");
    expect(initialLocale(null, ["zh-SG"])).toBe("zh-CN");
  });

  it("always gives the saved preference priority", () => {
    expect(initialLocale("en", ["zh-CN"])).toBe("en");
    expect(initialLocale("zh-CN", ["en-US"])).toBe("zh-CN");
  });

  it("keeps English and Chinese resource keys complete", () => {
    expect(translationKeyDifferences()).toEqual({
      missing: [],
      unexpected: [],
    });
  });

  it("falls back safely and reports missing keys in development", () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    expect(translate("Missing message" as Message, "zh-CN")).toBe(
      "Missing message",
    );
    expect(warning).toHaveBeenCalledWith(
      "Missing translation: Missing message",
    );
    expect(
      translationKeyDifferences({ expected: "expected" }, { extra: "额外" }),
    ).toEqual({ missing: ["expected"], unexpected: ["extra"] });
    warning.mockRestore();
  });

  it("covers every static user-facing English string in the client template", () => {
    const html = readFileSync("src/client/index.html", "utf8")
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "");
    const allowed = new Set([
      "PourMed",
      "PourMed — Medication reminder",
      "English",
      "简体中文",
      "IANA time zone",
      "10",
      "15",
      "20",
      "30",
      "45",
      "60",
      "0",
      "○",
      "—",
      "×",
    ]);
    const uncovered = [...html.matchAll(/>([^<]+)</g)]
      .map((match) =>
        match[1]!.replace(/\s+/g, " ").trim().replaceAll("&amp;", "&"),
      )
      .filter(Boolean)
      .filter((value) => !(value in zh) && !allowed.has(value));
    expect(uncovered).toEqual([]);
  });

  it("wires immediate persistence, document metadata, and server notification synchronization", () => {
    const client = readFileSync("src/client/main.ts", "utf8");
    const i18n = readFileSync("src/client/i18n.ts", "utf8");
    expect(i18n).toContain("localStorage.setItem(STORAGE_KEY, next)");
    expect(i18n).toContain("document.documentElement.lang = next");
    expect(client).toContain("setLocale(next)");
    expect(client).toContain('mutate("/api/language", "PUT"');
  });

  it("translates user-facing copy without bilingual labels", () => {
    expect(translate("Settings", "zh-CN")).toBe("设置");
    expect(translate("Settings", "en")).toBe("Settings");
    expect(translate("Enable Notifications", "zh-CN")).toBe("开启通知");
  });

  it("localizes reminder and test notification content", () => {
    expect(notificationCopy("zh-CN", false)).toEqual({
      title: "服药提醒",
      body: "该吃今晚的药了。",
    });
    expect(notificationCopy("zh-CN", true).body).toBe("测试通知已正常送达。");
    expect(notificationCopy("en", false).body).toBe(
      "It’s time to take your medication.",
    );
    expect(notificationCopy("zh-CN", false, "", "晚间用药").body).toBe(
      "该吃「晚间用药」了。",
    );
  });

  it("formats the same instant in the active locale and selected zone", () => {
    const instant = new Date("2026-07-22T05:15:00Z");
    const options = {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Los_Angeles",
    } as const;
    expect(formatDateForLocale(instant, "en", options)).toContain("July");
    expect(formatDateForLocale(instant, "zh-CN", options)).toContain("2026年");
  });

  it.each([
    ["2026-07-22T07:00:00Z", "2026-07-21"],
    ["2026-07-22T11:00:00Z", "2026-07-21"],
    ["2026-07-22T13:59:00Z", "2026-07-21"],
    ["2026-07-22T14:00:00Z", "2026-07-22"],
    ["2026-03-08T11:59:00Z", "2026-03-07"],
    ["2026-11-01T08:30:00Z", "2026-10-31"],
    ["2026-11-01T09:30:00Z", "2026-10-31"],
  ])("does not change medication-day assignment at %s", (instant, expected) => {
    const before = getMedicationDayKey(
      new Date(instant),
      "America/Los_Angeles",
    );
    formatDateForLocale(new Date(instant), "zh-CN", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Los_Angeles",
    });
    expect(before).toBe(expected);
    expect(getMedicationDayKey(new Date(instant), "America/Los_Angeles")).toBe(
      expected,
    );
  });

  it("keeps schema, history, statistics, and push subscriptions outside language changes", () => {
    const worker = readFileSync("src/worker/index.ts", "utf8");
    const languageRoute = worker.slice(
      worker.indexOf('url.pathname === "/api/language"'),
      worker.indexOf('url.pathname === "/api/settings"'),
    );
    expect(languageRoute).toContain("INSERT INTO config(key,value)");
    expect(languageRoute).not.toContain("subscription");
    expect(languageRoute).not.toContain("UPDATE settings");
    expect(worker).toContain("schemaVersion: 3");
  });
});
