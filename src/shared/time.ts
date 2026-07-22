export const REMINDER_MINUTES = [
  1320, 1350, 1380, 1410, 0, 30, 60, 90, 120, 150, 180, 210, 240,
] as const;
export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}
const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function localParts(date: Date): LocalParts {
  const p = Object.fromEntries(
    formatter
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
const key = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export function medicationDayKey(parts: LocalParts): string {
  const utc = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day - (parts.hour < 7 ? 1 : 0)),
  );
  return key(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}
export function minuteOfDay(p: LocalParts): number {
  return p.hour * 60 + p.minute;
}
export function reminderSlot(p: LocalParts): string | null {
  const minute = minuteOfDay(p);
  return (REMINDER_MINUTES as readonly number[]).includes(minute)
    ? `${medicationDayKey(p)}@${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`
    : null;
}
export function nextReminder(p: LocalParts): string | null {
  const m = minuteOfDay(p);
  const early = REMINDER_MINUTES.filter((x) => x <= 240);
  const late = REMINDER_MINUTES.filter((x) => x >= 1320);
  const n =
    m <= 240
      ? early.find((x) => x >= m)
      : m < 1320
        ? 1320
        : (late.find((x) => x >= m) ?? 0);
  return n === undefined
    ? null
    : `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export function windowEnded(p: LocalParts): boolean {
  const m = minuteOfDay(p);
  return m > 240 && m < 420;
}
