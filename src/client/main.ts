import {
  defaultSelectedDate,
  filterHistoryDays,
  fullHistoryStatus,
  nextStreakMilestone,
  shortHistoryStatus,
  statisticsDashboard,
  todaySummary,
  type StatisticsPeriod,
} from "./presentation";
import {
  adherence,
  automaticTimeZoneUpdate,
  type DaySummary,
} from "../shared/domain";
import {
  copy,
  formatClockMinute,
  formatDate,
  formatNumber,
  initializeLocale,
  locale,
  setLocale,
  t,
  translateDocument,
  type Locale,
} from "./i18n";

initializeLocale();

type ApiData = Record<string, unknown>;
type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  enabled: number;
  required: number;
  display_order: number;
  notes: string | null;
};
type Day = {
  day: string;
  status: string;
  taken: boolean;
  takenAt: string | null;
  note: string;
  corrected: boolean;
  doses: Array<{
    id: string;
    name: string;
    dosage: string | null;
    required: boolean;
    taken: boolean;
    takenAt: string | null;
  }>;
};
type Settings = {
  startMinute: number;
  endMinute: number;
  intervalMinute: number;
  timezone: string;
  timeZoneMode: "automatic" | "manual";
  remindersEnabled: boolean;
  completionMode: "group" | "individual";
  theme: string;
  quietPreference: boolean;
  badgePreference: boolean;
  previewText: string;
  preview: string;
};
type AppData = {
  day: string;
  status: Day;
  settings: Settings;
  medications: Medication[];
  nextReminder: string | null;
  nextReminderMinute?: number | null;
  reminderEnd: string;
  reminderEndMinute?: number;
  snoozeUntil: string | null;
  subscriptionActive: boolean;
  vapidPublicKey: string;
  diagnostics: {
    serviceWorkerVersion: string;
    expectedTokenLength: number | null;
    lastSuccessfulPush: string | null;
    lastPushError: string | null;
  };
};
type StatsResponse = {
  today: string;
  days: DaySummary[];
  definition: string;
};
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const token = $<HTMLInputElement>("token"),
  message = $("message");
let app: AppData | null = null,
  historyDays: Day[] = [],
  selectedDay: string | null = null,
  displayedHistoryMonth: string | null = null,
  statisticsData: StatsResponse | null = null;
class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly expectedTokenLength: number | null = null,
  ) {
    super(message);
  }
}
const note = (s: string) => {
  message.textContent = s;
};
const errorMessage = (error: unknown) => {
  if (locale() === "en") return (error as Error).message;
  if (error instanceof ApiError && error.status === 401)
    return t("Invalid access token");
  if (error instanceof ApiError && error.code === "INVALID_TIMEZONE")
    return t("Invalid time zone");
  const raw = (error as Error).message ?? "";
  if (/permission.*(denied|not granted)/i.test(raw))
    return t("Notification permission was denied");
  if (/unsupported/i.test(raw))
    return t("Notifications are not supported on this device");
  return t("Something went wrong. Please try again.");
};
const idempotency = () => crypto.randomUUID();
function storedToken() {
  try {
    return (localStorage.getItem("pourmed-token") ?? "").trim();
  } catch {
    return "";
  }
}
token.value = storedToken();
$("local-token-length").textContent = String(token.value.length);
async function api<T = ApiData>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      authorization: `Bearer ${storedToken() || token.value.trim()}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = (await res.json()) as {
    ok: boolean;
    data?: unknown;
    error?: {
      code: string;
      message: string;
      expectedTokenLength?: number | null;
    };
  };
  if (!res.ok)
    throw new ApiError(
      res.status,
      data.error?.code ?? "REQUEST_FAILED",
      data.error?.message ?? "Request failed",
      data.error?.expectedTokenLength ?? null,
    );
  return data.data as T;
}
async function mutate(
  path: string,
  method = "POST",
  data: unknown = {},
): Promise<ApiData> {
  return api(path, {
    method,
    headers: { "idempotency-key": idempotency() },
    body: JSON.stringify(data),
  });
}
async function syncLanguage() {
  if (!storedToken()) return;
  try {
    if (localStorage.getItem("pourmed-language-synced") === locale()) return;
    await mutate("/api/language", "PUT", { language: locale() });
    localStorage.setItem("pourmed-language-synced", locale());
  } catch (error) {
    note(errorMessage(error));
  }
}
const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const timeValue = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const minuteValue = (v: string) => {
  const [h, m] = v.split(":").map(Number);
  return h! * 60 + m!;
};
const detectedTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const validTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone.includes("/") || timeZone === "UTC";
  } catch {
    return false;
  }
};
function settingsPayload(s: Settings, overrides: Partial<Settings> = {}) {
  return {
    startMinute: s.startMinute,
    endMinute: s.endMinute,
    intervalMinute: s.intervalMinute,
    timezone: s.timezone,
    timeZoneMode: s.timeZoneMode,
    remindersEnabled: s.remindersEnabled,
    completionMode: s.completionMode,
    theme: s.theme,
    quietPreference: s.quietPreference,
    badgePreference: s.badgePreference,
    previewText: s.previewText,
    ...overrides,
  };
}
function renderTimeZoneControls() {
  if (!app) return;
  const automatic = $<HTMLInputElement>("timezone-automatic").checked,
    detected = detectedTimeZone();
  $("manual-timezone-field").hidden = automatic;
  $("timezone-warning").hidden = automatic;
  $("active-timezone").textContent = automatic
    ? copy.automaticZone(detected)
    : copy.manualZone($<HTMLInputElement>("timezone").value);
}
async function notificationDiagnostics() {
  const supported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  $("pwa-state").textContent = matchMedia("(display-mode: standalone)").matches
    ? "Installed Home Screen app"
    : "Browser tab";
  $("permission-state").textContent = supported
    ? Notification.permission
    : "Unsupported";
  if (!supported) {
    $("subscription-state").textContent = "Unsupported";
    $("sw-version").textContent = "Unsupported";
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    $("sw-version").textContent = registration
      ? (app?.diagnostics.serviceWorkerVersion ?? "Registered")
      : "Not registered";
    const subscription = await registration?.pushManager.getSubscription();
    $("subscription-state").textContent = subscription
      ? "Active on this device"
      : app?.subscriptionActive
        ? "Active on another device"
        : "Missing";
  } catch (error) {
    $("subscription-state").textContent = "Check failed";
    $("sw-version").textContent = "Check failed";
    note(errorMessage(error));
  }
  translateDocument();
}
function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme === "system" ? "" : theme;
}
function renderToday() {
  if (!app) return;
  const d = app.status as Day,
    s = app.settings,
    meds = (app.medications as Medication[]).filter((m) => m.enabled),
    summary = todaySummary({
      status: d.status,
      remindersEnabled: s.remindersEnabled,
      nextReminder: app.nextReminder,
    });
  $("day").textContent = copy.medicationDay(app.day);
  $("status").textContent = summary.status;
  $("status-icon").textContent =
    d.status === "taken" ? "✓" : d.status === "partial" ? "◐" : "○";
  $("detail").textContent =
    d.taken && d.takenAt
      ? copy.completedAt(
          formatDate(new Date(d.takenAt), {
            hour: "numeric",
            minute: "2-digit",
            timeZone: s.timezone,
          }),
        )
      : meds.length
        ? copy.doseCount(
            d.doses.filter((x) => x.taken).length,
            d.doses.filter((x) => x.required).length,
          )
        : copy.addMedicationHint();
  $("schedule-summary").textContent = copy.schedulePreview(
    formatClockMinute(s.startMinute),
    formatClockMinute(s.endMinute),
    s.intervalMinute,
  );
  $("next-reminder").textContent =
    app.nextReminderMinute === undefined || app.nextReminderMinute === null
      ? summary.reminder
      : formatClockMinute(app.nextReminderMinute);
  $("today-summary-day").textContent = formatDate(
    new Date(`${app.day}T12:00:00`),
    { dateStyle: "full" },
  );
  $("today-summary-status").textContent = summary.status;
  $("today-summary-next").textContent =
    app.nextReminderMinute === undefined || app.nextReminderMinute === null
      ? summary.reminder
      : formatClockMinute(app.nextReminderMinute);
  $("today-summary-interval").textContent = copy.interval(s.intervalMinute);
  $("today-summary-end").textContent = formatClockMinute(
    app.reminderEndMinute ?? s.endMinute,
  );
  const list = $("today-medications");
  list.replaceChildren();
  for (const med of meds) {
    const dose = d.doses.find((x) => x.id === med.id),
      li = el("li");
    const icon = el("span", dose?.taken ? "✓" : "○");
    icon.setAttribute("aria-hidden", "true");
    const label = el(
      "span",
      copy.medicationLabel(med.name, med.dosage, !!med.required),
    );
    li.append(icon, label);
    if (s.completionMode === "individual") {
      const b = el("button", dose?.taken ? "Undo" : "Taken");
      b.setAttribute(
        "aria-label",
        `${t(dose?.taken ? "Mark not taken" : "Mark taken")}: ${med.name}`,
      );
      b.onclick = () => void setTaken(!dose?.taken, med.id);
      li.append(b);
    }
    list.append(li);
  }
  const primary = $<HTMLButtonElement>("taken");
  primary.textContent =
    meds.length === 1 ? "I Took My Medication" : "I Took My Medications";
  primary.hidden = s.completionMode === "individual";
  primary.disabled = d.taken;
  $("mark-all").hidden = s.completionMode !== "individual" || d.taken;
  $("undo").hidden = !d.taken;
  $("snooze-state").textContent = app.snoozeUntil
    ? copy.snoozedUntil(
        formatDate(new Date(app.snoozeUntil), {
          hour: "numeric",
          minute: "2-digit",
          timeZone: s.timezone,
        }),
      )
    : "";
  $("cancel-snooze").hidden = !app.snoozeUntil;
  applyTheme(s.theme);
  translateDocument();
}
function renderSettings() {
  if (!app) return;
  const s = app.settings;
  $<HTMLSelectElement>("language").value = locale();
  $<HTMLInputElement>("start-time").value = timeValue(s.startMinute);
  $<HTMLInputElement>("end-time").value = timeValue(s.endMinute);
  $<HTMLSelectElement>("interval").value = String(s.intervalMinute);
  $<HTMLInputElement>("timezone").value = s.timezone;
  $<HTMLInputElement>("timezone-automatic").checked =
    s.timeZoneMode === "automatic";
  $<HTMLInputElement>("timezone-manual").checked = s.timeZoneMode === "manual";
  renderTimeZoneControls();
  $<HTMLInputElement>("reminders-enabled").checked = s.remindersEnabled;
  $<HTMLSelectElement>("completion-mode").value = s.completionMode;
  $<HTMLSelectElement>("theme").value = s.theme;
  $<HTMLInputElement>("quiet-preference").checked = s.quietPreference;
  $<HTMLInputElement>("badge-preference").checked = s.badgePreference;
  $<HTMLInputElement>("preview-text").value = s.previewText;
  const list = $("medication-list");
  list.replaceChildren();
  const meds = app.medications;
  for (const [index, m] of meds.entries()) {
    const row = el("div", undefined, "med-row"),
      name = el(
        "div",
        `${m.enabled ? "" : `${t("Disabled")} — `}${copy.medicationLabel(m.name, m.dosage, !!m.required)}`,
        "grow",
      ),
      edit = el("button", t("Edit")),
      up = el("button", "↑"),
      down = el("button", "↓"),
      del = el("button", t("Delete"));
    edit.onclick = () => openMedication(m);
    up.disabled = index === 0;
    down.disabled = index === meds.length - 1;
    up.onclick = () => void reorder(index, -1);
    down.onclick = () => void reorder(index, 1);
    del.onclick = () => void deleteMedication(m);
    row.append(name, up, down, edit, del);
    list.append(row);
  }
  const mf = $<HTMLSelectElement>("medication-filter");
  mf.replaceChildren(
    new Option(t("All medications"), "all"),
    ...meds.map((m) => new Option(m.name, m.id)),
  );
  const diag = app.diagnostics;
  $("auth-state").textContent = "Authenticated";
  $("local-token-length").textContent = String(storedToken().length);
  $("server-token-length").textContent =
    app.diagnostics.expectedTokenLength === null
      ? "Unknown"
      : String(app.diagnostics.expectedTokenLength);
  $("subscription-state").textContent = app.subscriptionActive
    ? "Active"
    : "Missing";
  $("sw-version").textContent = diag.serviceWorkerVersion;
  $("last-push").textContent = diag.lastSuccessfulPush
    ? formatDate(new Date(diag.lastSuccessfulPush), {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: s.timezone,
      })
    : "None recorded";
  $("last-push-error").textContent = diag.lastPushError ?? "None recorded";
  void notificationDiagnostics();
  translateDocument();
}
function renderHistory() {
  if (!app) return;
  const status = $<HTMLSelectElement>("history-filter").value,
    med = $<HTMLSelectElement>("medication-filter").value,
    month = displayedHistoryMonth ?? app.day.slice(0, 7),
    monthDays = historyDays
      .filter((day) => day.day.startsWith(month))
      .sort((a, b) => a.day.localeCompare(b.day)),
    filtered = filterHistoryDays(historyDays, month, status, med),
    visible = new Set(filtered.map((day) => day.day)),
    calendar = $("calendar");
  if (!selectedDay || !visible.has(selectedDay))
    selectedDay = defaultSelectedDate(filtered, month, app.day);
  calendar.replaceChildren();
  calendar.setAttribute(
    "aria-label",
    formatDate(new Date(`${month}-01T12:00:00`), {
      month: "long",
      year: "numeric",
    }),
  );
  const offset = new Date(`${month}-01T12:00:00`).getDay();
  for (let i = 0; i < offset; i++)
    calendar.append(el("span", undefined, "calendar-placeholder"));
  for (const d of monthDays) {
    if (!visible.has(d.day)) {
      calendar.append(el("span", undefined, "calendar-placeholder"));
      continue;
    }
    const cell = el("button");
    cell.append(
      el("span", String(Number(d.day.slice(-2))), "calendar-day-number"),
      el("span", shortHistoryStatus(d.status), "calendar-status"),
    );
    const fullDate = formatDate(new Date(`${d.day}T12:00:00`), {
      dateStyle: "full",
    });
    cell.setAttribute(
      "aria-label",
      `${fullDate}: ${fullHistoryStatus(d.status)}`,
    );
    cell.setAttribute("aria-selected", String(d.day === selectedDay));
    cell.onclick = () => selectDay(d.day);
    calendar.append(cell);
  }
  renderSelectedDay(
    filtered.find((day) => day.day === selectedDay),
    med,
  );
  translateDocument();
}
function renderStats(data: StatsResponse) {
  const period = $<HTMLSelectElement>("stats-period").value as StatisticsPeriod,
    dashboard = statisticsDashboard(data.days, period, data.today),
    stats = dashboard.stats,
    all = adherence(data.days),
    hasAnyHistory = all.takenDays + all.partialDays + all.missedDays > 0,
    hasPeriodHistory = dashboard.scheduledDays > 0,
    empty = $("stats-empty"),
    content = $("stats-content"),
    grid = $("stats-grid");
  empty.hidden = hasPeriodHistory;
  content.hidden = !hasPeriodHistory;
  if (!hasPeriodHistory) {
    $("stats-empty-title").textContent = hasAnyHistory
      ? t("No medication history for this period.")
      : t("No medication history yet.");
    $("stats-empty-detail").textContent = hasAnyHistory
      ? t("Choose another period to view adherence and streaks.")
      : t(
          "Complete your first medication day to start tracking adherence and streaks.",
        );
    return;
  }
  grid.replaceChildren();
  const adherenceCard = el("article", undefined, "stat adherence-stat"),
    adherenceValue = el("strong", `${formatNumber(stats.adherencePercent)}%`),
    adherenceDetail = el(
      "span",
      copy.takenOfScheduled(stats.takenDays, dashboard.scheduledDays),
      "stat-detail",
    );
  adherenceCard.setAttribute(
    "aria-label",
    copy.adherenceLabel(
      stats.adherencePercent,
      stats.takenDays,
      dashboard.scheduledDays,
    ),
  );
  adherenceCard.append(
    el("span", t("Adherence")),
    adherenceValue,
    adherenceDetail,
  );
  if (dashboard.change !== null && dashboard.change !== 0) {
    adherenceCard.append(
      el("span", copy.comparison(dashboard.change), "stat-change"),
    );
  }
  grid.append(adherenceCard);
  for (const [label, key] of [
    ["Current streak", "currentStreak"],
    ["Longest streak", "longestStreak"],
    ["Taken days", "takenDays"],
    ["Missed days", "missedDays"],
    ["Partial days", "partialDays"],
  ] as const) {
    const box = el("article", undefined, "stat"),
      value = stats[key];
    box.setAttribute("aria-label", `${t(label)}: ${formatNumber(value)}`);
    box.append(el("span", t(label)), el("strong", formatNumber(value)));
    grid.append(box);
  }
  const consistency = $("consistency-summary");
  consistency.replaceChildren();
  if (!stats.currentStreak) {
    consistency.append(el("p", t("Start your first streak today.")));
  } else {
    const milestone = nextStreakMilestone(stats.currentStreak);
    for (const [label, value] of [
      ["Current streak", copy.medicationDays(stats.currentStreak)],
      ["Longest streak", copy.medicationDays(stats.longestStreak)],
      [
        "Next milestone",
        milestone ? copy.medicationDays(milestone) : t("Keep going"),
      ],
    ]) {
      consistency.append(
        el(
          "span",
          t(label as "Current streak" | "Longest streak" | "Next milestone"),
        ),
        el("strong", value),
      );
    }
  }
  const timeline = $("stats-timeline");
  timeline.replaceChildren();
  const timelineDays = dashboard.selected.filter((day) =>
    ["taken", "missed", "partial", "none"].includes(day.status),
  );
  for (const day of timelineDays) {
    const button = el(
        "button",
        undefined,
        `timeline-day timeline-${day.status}`,
      ),
      date = formatDate(new Date(`${day.day}T12:00:00`), {
        dateStyle: "full",
      }),
      status = fullHistoryStatus(day.status),
      completion = day.required
        ? copy.completionCount(day.takenRequired, day.required)
        : copy.noScheduleCompletion();
    button.append(
      el("span", String(Number(day.day.slice(-2))), "timeline-date"),
      el(
        "span",
        day.status === "none"
          ? "—"
          : day.status[0]!.toUpperCase() + day.status.slice(1),
        "timeline-status",
      ),
    );
    button.setAttribute(
      "aria-label",
      copy.timelineLabel(date, status, completion),
    );
    button.title = `${date}: ${status}`;
    button.onclick = () => openHistoryFromStatistics(day.day);
    timeline.append(button);
  }
  $("timeline-description").textContent = copy.statusCounts(
    stats.takenDays,
    stats.missedDays,
    stats.partialDays,
    timelineDays.filter((day) => day.status === "none").length,
  );
  $("stats-definition").textContent = data.definition;
  translateDocument();
}

function openHistoryFromStatistics(day: string) {
  selectedDay = day;
  displayedHistoryMonth = day.slice(0, 7);
  document.querySelector<HTMLButtonElement>('[data-view="history"]')?.click();
}

async function loadStatistics() {
  statisticsData ??= await api<StatsResponse>("/api/statistics");
  renderStats(statisticsData);
}
async function load() {
  if (!storedToken()) {
    $("auth-state").textContent = t("Token not saved");
    void notificationDiagnostics();
    return;
  }
  try {
    app = await api<AppData>("/api/status");
    await syncLanguage();
    let timeZoneNotice = "";
    const deviceTimeZone = detectedTimeZone(),
      updatedTimeZone = automaticTimeZoneUpdate(
        app.settings.timeZoneMode,
        app.settings.timezone,
        deviceTimeZone,
      );
    if (updatedTimeZone) {
      app = await api<AppData>("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          settingsPayload(app.settings, { timezone: updatedTimeZone }),
        ),
      });
      timeZoneNotice = copy.timeZoneUpdated(updatedTimeZone);
    }
    statisticsData = null;
    renderToday();
    renderSettings();
    $("connection").textContent = t("Online");
    note(timeZoneNotice);
    localStorage.setItem("pourmed-last-status", JSON.stringify(app));
  } catch (e) {
    $("connection").textContent = navigator.onLine
      ? t("Server unavailable")
      : t("Offline");
    $("auth-state").textContent =
      e instanceof ApiError && e.status === 401
        ? t("Token rejected")
        : t("Unavailable");
    $("local-token-length").textContent = String(storedToken().length);
    if (e instanceof ApiError && e.expectedTokenLength !== null)
      $("server-token-length").textContent = String(e.expectedTokenLength);
    note(errorMessage(e));
  }
}
async function setTaken(take: boolean, medicationId?: string, day?: string) {
  const buttons = document.querySelectorAll<HTMLButtonElement>("button");
  buttons.forEach((b) => (b.disabled = true));
  try {
    await mutate(take ? "/api/taken" : "/api/not-taken", "POST", {
      medicationId,
      day,
    });
    note(
      take
        ? t("Saved as taken.")
        : t("Correction saved. Future reminders may resume."),
    );
    await load();
    if (day) await loadHistory();
  } catch (e) {
    note(errorMessage(e));
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}
async function loadHistory() {
  const month = displayedHistoryMonth ?? app?.day.slice(0, 7);
  if (!month) return;
  const data = await api<{ days: Day[] }>(
    `/api/history?month=${encodeURIComponent(month)}`,
  );
  historyDays = data.days;
  renderHistory();
}
function selectDay(day: string) {
  selectedDay = day;
  renderHistory();
}
function renderSelectedDay(d: Day | undefined, medicationFilter: string) {
  const content = $("selected-day-content"),
    noteInput = $<HTMLTextAreaElement>("day-note"),
    saveNote = $<HTMLButtonElement>("save-day-note");
  content.replaceChildren();
  if (!d) {
    $("selected-day-title").textContent = selectedDay
      ? formatDate(new Date(`${selectedDay}T12:00:00`), {
          dateStyle: "full",
        })
      : "No matching medication day";
    content.append(el("p", "No history matches the active filters."));
    noteInput.value = "";
    noteInput.disabled = true;
    saveNote.disabled = true;
    return;
  }
  const fullDate = formatDate(new Date(`${d.day}T12:00:00`), {
    dateStyle: "full",
  });
  $("selected-day-title").textContent = fullDate;
  const details = el("dl", undefined, "diagnostics");
  for (const [label, value] of [
    ["Schedule", d.status === "none" ? "No schedule" : "Scheduled"],
    ["Completion", fullHistoryStatus(d.status)],
    [
      "Taken at",
      d.takenAt
        ? formatDate(new Date(d.takenAt), {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: app?.settings.timezone,
          })
        : "Not recorded",
    ],
    [copy.missedQuestion(), d.status === "missed" ? "Yes" : "No"],
    [
      "Reminder window",
      app
        ? copy.schedulePreview(
            formatClockMinute(app.settings.startMinute),
            formatClockMinute(app.settings.endMinute),
            app.settings.intervalMinute,
          )
        : t("Unavailable"),
    ],
    [copy.correctedQuestion(), d.corrected ? "Yes" : "No"],
  ]) {
    details.append(el("dt", label), el("dd", value));
  }
  content.append(details, el("h4", "Medications"));
  const doses = d.doses.filter(
    (dose) => medicationFilter === "all" || dose.id === medicationFilter,
  );
  if (!doses.length) content.append(el("p", "No medications recorded."));
  for (const dose of doses) {
    const row = el("div", undefined, "med-row"),
      label = el(
        "p",
        copy.medicationStatusLabel(
          dose.name,
          dose.dosage,
          t(dose.taken ? "Taken" : "Not taken"),
        ),
      ),
      button = el("button", dose.taken ? "Mark Not Taken" : "Mark Taken");
    button.onclick = () => {
      if (confirm(copy.correctionPrompt(dose.name, d.day)))
        void setTaken(!dose.taken, dose.id, d.day);
    };
    row.append(label, button);
    content.append(row);
  }
  const groupCorrection = el(
    "button",
    d.taken ? "Mark All Not Taken" : "Mark All Taken",
  );
  groupCorrection.onclick = () => {
    if (confirm(copy.groupCorrectionPrompt(d.day)))
      void setTaken(!d.taken, undefined, d.day);
  };
  content.append(groupCorrection);
  noteInput.value = d.note;
  noteInput.disabled = false;
  saveNote.disabled = false;
  translateDocument();
}
function openMedication(m?: Medication) {
  $<HTMLInputElement>("med-id").value = m?.id ?? "";
  $<HTMLInputElement>("med-name").value = m?.name ?? "";
  $<HTMLInputElement>("med-dosage").value = m?.dosage ?? "";
  $<HTMLTextAreaElement>("med-instructions").value = m?.instructions ?? "";
  $<HTMLTextAreaElement>("med-notes").value = m?.notes ?? "";
  $<HTMLInputElement>("med-enabled").checked = m ? !!m.enabled : true;
  $<HTMLInputElement>("med-required").checked = m ? !!m.required : true;
  $("med-title").textContent = m ? "Edit medication" : "Add medication";
  $<HTMLDialogElement>("med-dialog").showModal();
}
async function reorder(index: number, delta: number) {
  if (!app) return;
  const meds = [...app.medications],
    [m] = meds.splice(index, 1);
  meds.splice(index + delta, 0, m!);
  await mutate("/api/medications/reorder", "POST", {
    ids: meds.map((x) => x.id),
  });
  await load();
}
async function deleteMedication(m: Medication) {
  if (confirm(copy.deleteMedicationPrompt(m.name))) {
    await api(`/api/medications/${m.id}`, { method: "DELETE" });
    await load();
  }
}
async function download(format: "json" | "csv") {
  const res = await fetch(`/api/export?format=${format}`, {
    headers: { authorization: `Bearer ${storedToken()}` },
  });
  if (!res.ok) throw new Error("Export failed.");
  const blob = await res.blob(),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = format === "csv" ? "pourmed-history.csv" : "pourmed-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}
async function subscribe() {
  if (!("Notification" in window))
    throw new Error("Notifications are unsupported.");
  if (
    /iPhone|iPad/.test(navigator.userAgent) &&
    !matchMedia("(display-mode: standalone)").matches
  )
    throw new Error("Open PourMed from the Home Screen first.");
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error("Notification permission was not granted.");
  const reg = await navigator.serviceWorker.ready,
    existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: app!.vapidPublicKey,
  });
  await mutate("/api/push/subscribe", "POST", sub);
  await load();
}
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll(".view")
        .forEach((v) => v.classList.remove("active"));
      $(`${b.dataset.view}-view`).classList.add("active");
      document
        .querySelectorAll<HTMLButtonElement>("[data-view]")
        .forEach((x) => x.removeAttribute("aria-current"));
      b.setAttribute("aria-current", "page");
      if (b.dataset.view === "history") void loadHistory();
      if (b.dataset.view === "stats")
        void loadStatistics().catch((error) => note(errorMessage(error)));
    }),
);
$<HTMLButtonElement>("taken").onclick = () => void setTaken(true);
$<HTMLButtonElement>("mark-all").onclick = () => void setTaken(true);
$<HTMLButtonElement>("undo").onclick = () => {
  if (confirm(t("Mark this medication day as not taken?")))
    void setTaken(false);
};
document.querySelectorAll<HTMLButtonElement>("[data-snooze]").forEach(
  (b) =>
    (b.onclick = () =>
      void mutate("/api/snooze", "POST", {
        minutes: Number(b.dataset.snooze),
      }).then(load)),
);
$<HTMLButtonElement>("cancel-snooze").onclick = () =>
  void api("/api/snooze", { method: "DELETE" }).then(load);
$<HTMLFormElement>("schedule-form").onsubmit = (e) => {
  e.preventDefault();
  const automatic = $<HTMLInputElement>("timezone-automatic").checked,
    timezone = automatic
      ? detectedTimeZone()
      : $<HTMLInputElement>("timezone").value.trim();
  if (!validTimeZone(timezone)) {
    note(t("Choose a valid IANA time zone."));
    return;
  }
  void mutate("/api/settings", "PUT", {
    startMinute: minuteValue($<HTMLInputElement>("start-time").value),
    endMinute: minuteValue($<HTMLInputElement>("end-time").value),
    intervalMinute: Number($<HTMLSelectElement>("interval").value),
    timezone,
    timeZoneMode: automatic ? "automatic" : "manual",
    remindersEnabled: $<HTMLInputElement>("reminders-enabled").checked,
    completionMode: $<HTMLSelectElement>("completion-mode").value,
    theme: $<HTMLSelectElement>("theme").value,
    quietPreference: $<HTMLInputElement>("quiet-preference").checked,
    badgePreference: $<HTMLInputElement>("badge-preference").checked,
    previewText: $<HTMLInputElement>("preview-text").value,
  })
    .then(() => {
      note(t("Settings saved."));
      return load();
    })
    .catch((e) => note(errorMessage(e)));
};
$<HTMLInputElement>("timezone-automatic").onchange = renderTimeZoneControls;
$<HTMLInputElement>("timezone-manual").onchange = renderTimeZoneControls;
$<HTMLInputElement>("timezone").oninput = renderTimeZoneControls;
$<HTMLSelectElement>("language").onchange = () => {
  const next = $<HTMLSelectElement>("language").value as Locale;
  setLocale(next);
  if (app) {
    renderToday();
    renderSettings();
    if (historyDays.length) renderHistory();
    if (statisticsData) renderStats(statisticsData);
  }
  if (storedToken()) void syncLanguage();
};
const timeZones = (
  Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
).supportedValuesOf?.("timeZone") ?? [
  "America/Los_Angeles",
  "America/New_York",
  "Asia/Shanghai",
  "Europe/London",
  "UTC",
];
$<HTMLDataListElement>("timezone-options").replaceChildren(
  ...timeZones.map((timeZone) => new Option(timeZone)),
);
$<HTMLButtonElement>("add-medication").onclick = () => openMedication();
$<HTMLButtonElement>("close-med").onclick = () =>
  $<HTMLDialogElement>("med-dialog").close();
$<HTMLFormElement>("med-form").onsubmit = (e) => {
  e.preventDefault();
  const id = $<HTMLInputElement>("med-id").value,
    data = {
      name: $<HTMLInputElement>("med-name").value,
      dosage: $<HTMLInputElement>("med-dosage").value,
      instructions: $<HTMLTextAreaElement>("med-instructions").value,
      notes: $<HTMLTextAreaElement>("med-notes").value,
      enabled: $<HTMLInputElement>("med-enabled").checked,
      required: $<HTMLInputElement>("med-required").checked,
    };
  void mutate(
    id ? `/api/medications/${id}` : "/api/medications",
    id ? "PUT" : "POST",
    data,
  )
    .then(() => {
      $<HTMLDialogElement>("med-dialog").close();
      return load();
    })
    .catch((e) => note(errorMessage(e)));
};
$<HTMLButtonElement>("save-day-note").onclick = () =>
  void mutate("/api/day-note", "PUT", {
    day: selectedDay,
    note: $<HTMLTextAreaElement>("day-note").value,
  }).then(() => {
    note(t("Day note saved."));
    return loadHistory();
  });
$<HTMLSelectElement>("history-filter").onchange = renderHistory;
$<HTMLSelectElement>("medication-filter").onchange = renderHistory;
$<HTMLSelectElement>("stats-period").onchange = () => {
  if (statisticsData) renderStats(statisticsData);
};
document
  .querySelectorAll<HTMLButtonElement>("[data-export]")
  .forEach(
    (b) =>
      (b.onclick = () =>
        void download(b.dataset.export as "json" | "csv").catch((e) =>
          note(errorMessage(e)),
        )),
  );
$<HTMLButtonElement>("save-token").onclick = () => {
  const raw = token.value,
    v = raw.trim();
  try {
    $("local-token-length").textContent = String(v.length);
    $("token-trimmed").textContent = raw === v ? "No" : "Yes";
    localStorage.setItem("pourmed-token", v);
    if (localStorage.getItem("pourmed-token") !== v)
      throw new Error("Token could not be read back from device storage.");
    token.value = v;
    note(t("Access saved and read back. Checking server…"));
    void load();
  } catch (error) {
    note(errorMessage(error));
  }
};
$<HTMLButtonElement>("forget-token").onclick = () => {
  localStorage.removeItem("pourmed-token");
  token.value = "";
  location.reload();
};
$<HTMLButtonElement>("enable").onclick = () =>
  void subscribe().catch((e) => note(errorMessage(e)));
$<HTMLButtonElement>("refresh").onclick = () =>
  void subscribe().catch((e) => note(errorMessage(e)));
$<HTMLButtonElement>("test").onclick = () =>
  void mutate("/api/push/test")
    .then(() => note(t("Test notification sent.")))
    .catch((e) => note(errorMessage(e)));
$<HTMLButtonElement>("test-delayed").onclick = () =>
  void mutate("/api/push/test-delayed")
    .then(() => note(t("Delayed test scheduled. Lock the iPhone now.")))
    .catch((e) => note(errorMessage(e)));
$<HTMLButtonElement>("remove-device").onclick = () =>
  void api("/api/push/subscribe", { method: "DELETE" }).then(load);
window.addEventListener("online", () => void load());
window.addEventListener("offline", () => {
  $("connection").textContent = t("Offline");
  note(t("Offline — changes cannot be saved until reconnected."));
});
void notificationDiagnostics();
if ("serviceWorker" in navigator)
  void navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((reg) => {
      const banner = $("update-banner"),
        status = $("update-status"),
        button = $<HTMLButtonElement>("update-now"),
        hideUpdate = () => {
          banner.hidden = true;
          button.disabled = true;
          status.textContent = t("Up to date.");
        },
        showWaiting = () => {
          if (!reg.waiting) {
            hideUpdate();
            return;
          }
          banner.hidden = false;
          status.textContent = t("An update is available.");
          button.disabled = false;
        };
      showWaiting();
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed") showWaiting();
        });
      });
      button.onclick = () => {
        const waiting = reg.waiting;
        if (!waiting) {
          hideUpdate();
          void reg
            .update()
            .then(showWaiting)
            .catch((error) => {
              status.textContent = errorMessage(error);
              button.disabled = false;
            });
          return;
        }
        status.textContent = t("Applying update…");
        button.disabled = true;
        waiting.addEventListener("statechange", () => {
          if (waiting.state === "activated" || waiting.state === "redundant")
            hideUpdate();
        });
        waiting.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(() => location.reload(), 5000);
      };
      let reloading = false;
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "POURMED_ACTIVATED") hideUpdate();
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        hideUpdate();
        if (reloading) return;
        reloading = true;
        location.reload();
      });
      window.addEventListener("pageshow", showWaiting);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") showWaiting();
      });
      return notificationDiagnostics();
    })
    .catch((error) => {
      $("sw-version").textContent = t("Registration failed");
      $("subscription-state").textContent = t("Unavailable");
      note(errorMessage(error));
    });
void load();
