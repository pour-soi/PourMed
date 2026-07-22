export type HistoryDose = { id: string; taken: boolean };
export type HistoryDay = { day: string; status: string; doses: HistoryDose[] };

export function shortHistoryStatus(status: string) {
  if (status === "taken") return "Taken";
  if (status === "missed") return "Missed";
  if (status === "none") return "—";
  return "Pending";
}

export function fullHistoryStatus(status: string) {
  if (status === "taken") return "Taken";
  if (status === "partial") return "Partially taken";
  if (status === "missed") return "Missed";
  if (status === "none") return "No schedule";
  if (status === "future") return "Pending";
  return "Not taken yet";
}

export function filterHistoryDays<T extends HistoryDay>(
  days: T[],
  month: string,
  completion: string,
  medication: string,
) {
  return days.filter(
    (day) =>
      day.day.startsWith(month) &&
      (completion === "all" || day.status === completion) &&
      (medication === "all" ||
        day.doses.some((dose) => dose.id === medication)),
  );
}

export function defaultSelectedDate(
  visibleDays: Array<{ day: string }>,
  month: string,
  today: string,
) {
  if (visibleDays.some((day) => day.day === today)) return today;
  if (visibleDays.length)
    return visibleDays
      .map((day) => day.day)
      .sort()
      .at(-1)!;
  return `${month}-01`;
}

export function todaySummary(input: {
  status: string;
  remindersEnabled: boolean;
  nextReminder: string | null;
}) {
  const status =
    input.status === "taken"
      ? "Taken tonight"
      : input.status === "missed"
        ? "Missed"
        : input.status === "none"
          ? "No schedule"
          : "Not taken yet";
  const reminder = !input.remindersEnabled
    ? "Reminders are disabled."
    : input.status === "none"
      ? "No schedule."
      : input.status === "taken"
        ? "Later reminders are stopped for this medication day."
        : input.nextReminder
          ? input.nextReminder
          : "No reminders remain in the current medication window.";
  return { status, reminder };
}

export type StatisticsPeriod =
  | "current-month"
  | "previous-30"
  | "previous-90"
  | "this-year"
  | "all-time";

const shiftDate = (day: string, offset: number) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

function periodStart(period: StatisticsPeriod, today: string, first: string) {
  if (period === "current-month") return `${today.slice(0, 7)}-01`;
  if (period === "previous-30") return shiftDate(today, -29);
  if (period === "previous-90") return shiftDate(today, -89);
  if (period === "this-year") return `${today.slice(0, 4)}-01-01`;
  return first;
}

export function statisticsDashboard(
  days: DaySummary[],
  period: StatisticsPeriod,
  today: string,
) {
  const first = days[0]?.day ?? today,
    start = periodStart(period, today, first),
    selected = days.filter((day) => day.day >= start && day.day <= today),
    stats = adherence(selected),
    scheduledDays = stats.takenDays + stats.partialDays + stats.missedDays,
    span =
      Math.round(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
          86400000,
      ) + 1;
  let change: number | null = null;
  if (period !== "all-time") {
    const previousEnd = shiftDate(start, -1),
      previousStart = shiftDate(previousEnd, -(span - 1)),
      previous = adherence(
        days.filter(
          (day) => day.day >= previousStart && day.day <= previousEnd,
        ),
      ),
      previousScheduled =
        previous.takenDays + previous.partialDays + previous.missedDays;
    if (previousScheduled)
      change = stats.adherencePercent - previous.adherencePercent;
  }
  return { stats, scheduledDays, selected, change };
}

export function nextStreakMilestone(streak: number) {
  return [3, 7, 10, 14, 21, 30, 60, 90, 100, 180, 365].find(
    (milestone) => milestone > streak,
  );
}
import { adherence, type DaySummary } from "../shared/domain";
