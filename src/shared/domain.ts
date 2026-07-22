export const INTERVALS = [10, 15, 20, 30, 45, 60] as const;
export type CompletionMode = "group" | "individual";
export type DayStatus =
  | "taken"
  | "partial"
  | "missed"
  | "open"
  | "none"
  | "future";
export interface ScheduleSettings {
  startMinute: number;
  endMinute: number;
  intervalMinute: (typeof INTERVALS)[number];
  timezone: string;
  remindersEnabled: boolean;
  completionMode: CompletionMode;
}
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}
export interface DoseSummary {
  required: boolean;
  taken: boolean;
}
export interface DaySummary {
  day: string;
  status: DayStatus;
  required: number;
  takenRequired: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  const p = Object.fromEntries(
    f
      .formatToParts(date)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, Number(x.value)]),
  );
  return {
    year: p.year!,
    month: p.month!,
    day: p.day!,
    hour: p.hour!,
    minute: p.minute!,
  };
}
const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
export function medicationDay(parts: ZonedParts): string {
  return dateKey(
    new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day - (parts.hour < 7 ? 1 : 0),
      ),
    ),
  );
}
export const minuteOfDay = (p: ZonedParts) => p.hour * 60 + p.minute;
export function scheduleDuration(s: ScheduleSettings): number {
  return s.endMinute >= s.startMinute
    ? s.endMinute - s.startMinute
    : 1440 - s.startMinute + s.endMinute;
}
export function slotOffset(minute: number, s: ScheduleSettings): number | null {
  const duration = scheduleDuration(s);
  const offset =
    minute >= s.startMinute
      ? minute - s.startMinute
      : 1440 - s.startMinute + minute;
  return offset <= duration && offset % s.intervalMinute === 0 ? offset : null;
}
export function scheduledSlot(
  parts: ZonedParts,
  s: ScheduleSettings,
): string | null {
  if (!s.remindersEnabled || slotOffset(minuteOfDay(parts), s) === null)
    return null;
  return `${medicationDay(parts)}@${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}
export function nextSlotMinute(
  minute: number,
  s: ScheduleSettings,
): number | null {
  if (!s.remindersEnabled) return null;
  const duration = scheduleDuration(s);
  let best: { minute: number; delta: number } | null = null;
  for (let o = 0; o <= duration; o += s.intervalMinute) {
    const candidate = (s.startMinute + o) % 1440;
    const delta = (candidate - minute + 1440) % 1440;
    if (!best || delta < best.delta) best = { minute: candidate, delta };
  }
  return best?.minute ?? null;
}
export function schedulePreview(s: ScheduleSettings): string {
  return `Reminders every ${s.intervalMinute} minutes from ${formatMinute(s.startMinute)} until ${formatMinute(s.endMinute)}.`;
}
export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60) % 24,
    m = minute % 60,
    suffix = h >= 12 ? "PM" : "AM",
    hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
export function completion(
  doses: DoseSummary[],
  mode: CompletionMode,
  legacyTaken = false,
): "taken" | "partial" | "not-taken" | "none" {
  if (legacyTaken) return "taken";
  const required = doses.filter((x) => x.required);
  if (!required.length) return "none";
  const count = required.filter((x) => x.taken).length;
  if (mode === "group")
    return count === required.length ? "taken" : "not-taken";
  return count === required.length ? "taken" : count ? "partial" : "not-taken";
}
export function classifyDay(
  day: string,
  today: string,
  windowOpen: boolean,
  doses: DoseSummary[],
  mode: CompletionMode,
  legacyTaken = false,
): DayStatus {
  if (day > today) return "future";
  const c = completion(doses, mode, legacyTaken);
  if (c === "none") return "none";
  if (c === "taken") return "taken";
  if (day === today && windowOpen) return c === "partial" ? "partial" : "open";
  return c === "partial" ? "partial" : "missed";
}
export function adherence(days: DaySummary[]) {
  const eligible = days.filter(
    (d) => d.status !== "future" && d.status !== "none" && d.status !== "open",
  );
  const scheduled = eligible.reduce((n, d) => n + d.required, 0),
    taken = eligible.reduce((n, d) => n + d.takenRequired, 0);
  let current = 0,
    longest = 0,
    run = 0;
  for (const d of eligible) {
    if (d.status === "taken") {
      run++;
      longest = Math.max(longest, run);
    } else run = 0;
  }
  for (
    let i = eligible.length - 1;
    i >= 0 && eligible[i]?.status === "taken";
    i--
  )
    current++;
  return {
    takenDays: eligible.filter((d) => d.status === "taken").length,
    partialDays: eligible.filter((d) => d.status === "partial").length,
    missedDays: eligible.filter((d) => d.status === "missed").length,
    adherencePercent: scheduled ? Math.round((taken / scheduled) * 100) : 0,
    currentStreak: current,
    longestStreak: longest,
  };
}
export function safeCsv(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@]/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}
