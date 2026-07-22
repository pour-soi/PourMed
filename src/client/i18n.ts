import type { Language } from "../shared/localization";

export const locales = ["en", "zh-CN"] as const;
export type Locale = Language;

const STORAGE_KEY = "pourmed-language";

export const zh = {
  "Medication day": "服药日",
  Online: "在线",
  Today: "首页",
  "Status unavailable": "暂时无法获取状态",
  "Connect to load today’s medications.": "登录后即可查看今天的用药。",
  "Current status": "服药状态",
  Unavailable: "暂不可用",
  "Next reminder": "下次提醒",
  "Reminder interval": "提醒间隔",
  "Reminder end": "提醒结束",
  "I Took My Medication": "我吃过了",
  "I Took My Medications": "我都吃过了",
  "Mark All Taken": "全部标为已服用",
  "Undo — Mark as Not Taken": "撤销服药记录",
  "Snooze 10m": "10 分钟后提醒",
  "20m": "20 分钟",
  "30m": "30 分钟",
  "60m": "60 分钟",
  "Cancel snooze": "取消延后提醒",
  History: "记录",
  Completion: "完成情况",
  All: "全部",
  Taken: "已服用",
  Partial: "部分完成",
  Pending: "待完成",
  Missed: "未完成",
  "No schedule": "无安排",
  Medication: "用药",
  "All medications": "全部用药",
  "Select a medication day": "选择一个服药日",
  "Day note": "当天备注",
  "Save Note": "保存备注",
  Statistics: "统计",
  Period: "时间范围",
  "Current month": "本月",
  "Previous 30 medication days": "最近 30 天",
  "Previous 90 medication days": "最近 90 天",
  "This year": "今年",
  "All time": "全部",
  "No medication history yet.": "暂无服药记录。",
  "Complete your first medication day to start tracking adherence and streaks.":
    "完成第一个服药日后，即可开始查看完成率和连续记录。",
  Consistency: "连续记录",
  "Completion timeline": "每日完成情况",
  Settings: "设置",
  "Reminder schedule": "提醒时间",
  "Start time": "开始时间",
  "End time": "结束时间",
  Interval: "提醒间隔",
  "Reminders enabled": "开启提醒",
  "Tracking mode": "记录方式",
  "Take all together": "统一记录",
  "Track individually": "分别记录",
  Notifications: "通知",
  "Prefer quiet notification presentation": "优先静默显示通知",
  "Show notification badge where supported": "支持时显示通知角标",
  "Optional notification preview": "通知预览（可选）",
  "Sound, Lock Screen, banners, Focus, and notification summaries are controlled in iPhone Settings → Notifications → PourMed.":
    "声音、锁屏、横幅、专注模式和通知摘要需前往 iPhone“设置 → 通知 → PourMed”调整。",
  "Enable Notifications": "开启通知",
  "Refresh Subscription": "刷新推送服务",
  "Send Test Notification": "发送测试通知",
  "Delayed Test Notification (10 seconds)": "10 秒后发送测试通知",
  "Remove This Device": "移除此设备",
  "Technical notification status is available in Advanced below.":
    "可在下方“高级”中查看通知状态。",
  "Time Zone": "时区",
  "Automatic — Device time zone": "使用设备时区",
  "Manual time zone": "手动选择时区",
  "IANA time zone": "选择时区",
  "Future reminders will use this time zone. Existing history will not be changed.":
    "今后的提醒将使用所选时区，不会影响已有记录。",
  Appearance: "外观",
  System: "跟随系统",
  Light: "浅色",
  Dark: "深色",
  "Save Settings": "保存设置",
  Advanced: "高级",
  "Technical diagnostics": "运行状态",
  "Server authentication": "服务器验证",
  "Not checked": "未检查",
  "Local token length": "本地令牌长度",
  "Server expected token length": "服务器预期令牌长度",
  "Trimming changed input": "输入含首尾空格",
  No: "否",
  Unknown: "未知",
  "Home Screen PWA": "主屏幕应用",
  "Checking…": "检查中…",
  "Notification permission": "通知权限",
  "Push subscription": "推送服务",
  "Service worker": "Service Worker",
  "Last successful push": "上次推送成功时间",
  "Last push error": "上次推送错误",
  "None recorded": "暂无记录",
  "Advanced access": "访问设置",
  "Private access token": "访问令牌",
  "Save on This Device": "保存到此设备",
  "Remove Access": "退出登录",
  Medications: "用药",
  "Add Medication": "添加用药",
  "Add medication": "添加用药",
  Name: "名称",
  Dosage: "剂量",
  Instructions: "用药说明",
  Notes: "备注",
  Enabled: "已开启",
  "Required for completion": "必服用药",
  "Save Medication": "保存用药",
  "Data export": "导出数据",
  "Exports include settings, medications, and history. Credentials and push subscription details are excluded.":
    "导出内容包括设置、用药和服药记录，不包含凭据和推送服务信息。",
  "Download JSON": "下载 JSON",
  "Download History CSV": "下载服药记录 CSV",
  "Safety & privacy": "安全与隐私",
  "PourMed is a personal reminder tool and does not provide medical advice. Do not take an extra dose solely because the app shows an uncertain status.":
    "PourMed 是个人提醒工具，不提供医疗建议。请勿仅因应用显示的状态不确定而额外服药。",
  "Delivery may be delayed by network loss, Focus modes, notification settings, subscription expiry, or platform changes. Do not use PourMed as the only safeguard for medically critical medication. Confirm uncertain dosing with a clinician or pharmacist.":
    "网络中断、专注模式、通知设置、推送服务失效或平台变化都可能导致提醒延迟。请勿将 PourMed 作为重要用药的唯一提醒方式；如不确定是否已经服药，请咨询医生或药师。",
  "An update is available.": "有新版本可用。",
  "Update Now": "立即更新",
  Language: "语言",
  English: "English",
  "Simplified Chinese": "简体中文",
  Close: "关闭",
  Primary: "主导航",
  "Close medication editor": "关闭用药编辑器",
  "Monthly medication history": "每月服药记录",
  "Taken tonight": "今晚已完成",
  "Not taken yet": "还没吃",
  "Not taken": "未完成",
  "Partially taken": "部分完成",
  "No reminders remain in the current medication window.":
    "本时段没有后续提醒。",
  "Reminders are disabled.": "提醒未开启。",
  "No schedule.": "暂无提醒。",
  "Later reminders are stopped for this medication day.": "今晚不会再提醒。",
  "Start your first streak today.": "从今天开始连续记录。",
  "No medication history for this period.": "所选时段暂无服药记录。",
  "Choose another period to view adherence and streaks.":
    "换个时间范围，即可查看完成率和连续记录。",
  Adherence: "完成率",
  "Current streak": "当前连续天数",
  "Longest streak": "最长连续天数",
  "Taken days": "已完成天数",
  "Missed days": "未完成天数",
  "Partial days": "部分完成天数",
  "Next milestone": "下一个目标",
  "Keep going": "继续保持",
  Scheduled: "有安排",
  Schedule: "提醒安排",
  "Taken at": "完成时间",
  "Not recorded": "暂无记录",
  Yes: "是",
  Corrected: "已更正",
  Edit: "编辑",
  Delete: "删除",
  Disabled: "未开启",
  optional: "可选",
  Undo: "撤销",
  "Mark taken": "标为已服用",
  "Mark not taken": "标为未完成",
  "Mark Taken": "标为已服用",
  "Mark Not Taken": "标为未完成",
  "Mark All Not Taken": "全部标为未完成",
  "Mark this medication day as not taken?": "要将这一天更正为未完成吗？",
  "No medications recorded.": "暂无用药记录。",
  "No history matches the active filters.": "暂无符合筛选条件的记录。",
  "No matching medication day": "没有符合条件的服药日",
  "Token not saved": "未保存访问令牌",
  Authenticated: "已登录",
  Active: "已连接",
  Missing: "未连接",
  Unsupported: "不支持",
  "Check failed": "检查失败",
  Registered: "已注册",
  "Not registered": "未注册",
  "Installed Home Screen app": "主屏幕应用已安装",
  "Browser tab": "浏览器标签页",
  "Active on this device": "本设备已连接",
  "Active on another device": "其他设备已连接",
  "Saved as taken.": "已记录。",
  "Correction saved. Future reminders may resume.":
    "更正已保存，后续提醒可能恢复。",
  "Choose a valid IANA time zone.": "请选择有效的时区。",
  "Settings saved.": "设置已保存。",
  "Day note saved.": "当天备注已保存。",
  "Access saved and read back. Checking server…": "访问令牌已保存，正在验证…",
  "Test notification sent.": "测试通知已发送。",
  "Delayed test scheduled. Lock the iPhone now.":
    "已安排 10 秒后的测试通知，现在可以锁定 iPhone。",
  "Offline — changes cannot be saved until reconnected.":
    "当前离线，恢复网络后才能保存更改。",
  Offline: "当前离线",
  "Server unavailable": "服务器不可用",
  "Token rejected": "访问令牌无效",
  "Up to date.": "已是最新版本。",
  "Applying update…": "正在更新…",
  "Registration failed": "注册失败",
  granted: "已允许",
  default: "尚未选择",
  denied: "已拒绝",
  "Reminder window": "提醒时段",
  "Completed days divided by scheduled days.":
    "已完成服药日占计划服药日的比例。",
  "Completed required doses divided by scheduled required doses.":
    "已完成必服项占计划必服项的比例。",
  "Something went wrong. Please try again.": "出现问题，请重试。",
  "Invalid access token": "访问令牌无效",
  "Invalid time zone": "时区无效",
  "Notification permission was denied": "通知权限已被拒绝",
  "Notifications are not supported on this device": "此设备不支持通知",
} as const;

export type Message = keyof typeof zh;
export const en = Object.freeze(
  Object.fromEntries(Object.keys(zh).map((key) => [key, key])) as Record<
    Message,
    string
  >,
);
let current: Locale = "en";

export function initialLocale(
  saved: string | null = safeGet(),
  languages: readonly string[] = navigator.languages,
): Locale {
  if (saved === "en" || saved === "zh-CN") return saved;
  return languages.some((language) => {
    const normalized = language.toLowerCase();
    return (
      normalized === "zh" ||
      normalized.startsWith("zh-cn") ||
      normalized.startsWith("zh-sg")
    );
  })
    ? "zh-CN"
    : "en";
}

function safeGet() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function locale() {
  return current;
}

export function translate(message: Message, language: Locale): string {
  const translated = language === "zh-CN" ? zh[message] : en[message];
  if (translated !== undefined) return translated;
  if (import.meta.env.DEV) console.warn(`Missing translation: ${message}`);
  return message;
}

export function t(message: Message): string {
  return translate(message, current);
}

export function translationKeyDifferences(
  english: Record<string, string> = en,
  chinese: Record<string, string> = zh,
) {
  const englishKeys = new Set(Object.keys(english));
  const chineseKeys = new Set(Object.keys(chinese));
  return {
    missing: [...englishKeys].filter((key) => !chineseKeys.has(key)),
    unexpected: [...chineseKeys].filter((key) => !englishKeys.has(key)),
  };
}

export function setLocale(next: Locale, persist = true) {
  current = next;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The active page still switches when storage is unavailable.
    }
  }
  document.documentElement.lang = next;
  document.title =
    next === "zh-CN" ? "PourMed — 服药提醒" : "PourMed — Medication reminder";
  translateDocument();
  document.documentElement.dataset.localeReady = "true";
}

export function translateDocument(root: ParentNode = document) {
  const messages = Object.entries(zh) as Array<[Message, string]>;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const value = node.nodeValue ?? "";
    const trimmed = value.trim().replace(/\s+/g, " ");
    const entry = messages.find(
      ([english, chinese]) => trimmed === english || trimmed === chinese,
    );
    if (!entry) continue;
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = `${leading}${current === "zh-CN" ? entry[1] : entry[0]}${trailing}`;
  }
  root
    .querySelectorAll<HTMLElement>("[data-i18n-aria-label]")
    .forEach((element) => {
      element.setAttribute(
        "aria-label",
        t(element.dataset.i18nAriaLabel as Message),
      );
    });
}

export const formatDate = (value: Date, options: Intl.DateTimeFormatOptions) =>
  formatDateForLocale(value, current, options);

export const formatDateForLocale = (
  value: Date,
  language: Locale,
  options: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat(language, options).format(value);

export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(current, options).format(value);

export const formatClockMinute = (minute: number) =>
  formatDate(
    new Date(Date.UTC(2020, 0, 1, Math.floor(minute / 60), minute % 60)),
    {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    },
  );

export const initializeLocale = () => setLocale(initialLocale());

export const copy = {
  medicationDay: (day: string) =>
    current === "zh-CN" ? `服药日：${day}` : `Medication day ${day}`,
  completedAt: (time: string) =>
    current === "zh-CN" ? `已于 ${time} 完成。` : `Completed at ${time}.`,
  doseCount: (taken: number, required: number) =>
    current === "zh-CN"
      ? `已完成 ${taken}/${required} 项必服用药。`
      : `${taken} of ${required} required medications taken.`,
  addMedicationHint: () =>
    current === "zh-CN"
      ? "可在设置中添加用药，也可继续整组记录。"
      : "Add medications in Settings, or keep using the group reminder button.",
  snoozedUntil: (time: string) =>
    current === "zh-CN" ? `已推迟至 ${time}。` : `Snoozed until ${time}.`,
  interval: (minutes: number) =>
    current === "zh-CN"
      ? `${formatNumber(minutes)} 分钟`
      : `${formatNumber(minutes)} minutes`,
  schedulePreview: (start: string, end: string, interval: number) =>
    current === "zh-CN"
      ? `${start}–${end}，每 ${interval} 分钟提醒一次。`
      : `Reminders every ${interval} minutes from ${start} until ${end}.`,
  automaticZone: (zone: string) =>
    current === "zh-CN" ? `使用设备时区：${zone}` : `Automatic — ${zone}`,
  manualZone: (zone: string) =>
    current === "zh-CN" ? `手动选择：${zone}` : `Manual — ${zone}`,
  timeZoneUpdated: (zone: string) =>
    current === "zh-CN"
      ? `时区已更新为 ${zone}。`
      : `Time zone updated to ${zone}.`,
  medicationDays: (days: number) =>
    current === "zh-CN"
      ? `${formatNumber(days)} 个服药日`
      : `${formatNumber(days)} medication days`,
  takenOfScheduled: (taken: number, scheduled: number) =>
    current === "zh-CN"
      ? `已完成 ${taken}/${scheduled} 个服药日`
      : `Taken ${taken} of ${scheduled} scheduled days`,
  statusCounts: (
    taken: number,
    missed: number,
    partial: number,
    none: number,
  ) =>
    current === "zh-CN"
      ? `已完成 ${taken} 天，未完成 ${missed} 天，部分完成 ${partial} 天，无安排 ${none} 天。`
      : `${taken} taken, ${missed} missed, ${partial} partial, and ${none} with no schedule.`,
  adherenceLabel: (percent: number, taken: number, scheduled: number) =>
    current === "zh-CN"
      ? `完成率 ${percent}%。已完成 ${taken}/${scheduled} 个服药日。`
      : `Adherence ${percent} percent. Taken ${taken} of ${scheduled} scheduled days.`,
  comparison: (change: number) =>
    current === "zh-CN"
      ? `${change > 0 ? "▲" : "▼"} ${change > 0 ? "+" : ""}${change}%（较上一时段）`
      : `${change > 0 ? "▲" : "▼"} ${change > 0 ? "+" : ""}${change}% vs previous period`,
  completionCount: (taken: number, required: number) =>
    current === "zh-CN"
      ? `已完成 ${taken}/${required} 项必服用药`
      : `${taken} of ${required} required medications taken`,
  noScheduleCompletion: () =>
    current === "zh-CN" ? "当天无用药安排" : "No medications scheduled",
  missedQuestion: () => (current === "zh-CN" ? "是否未完成" : "Missed"),
  correctedQuestion: () => (current === "zh-CN" ? "是否更正" : "Corrected"),
  timelineLabel: (date: string, status: string, completion: string) =>
    current === "zh-CN"
      ? `${date}。${status}。${completion}。`
      : `${date}. ${status}. ${completion}.`,
  medicationLabel: (name: string, dosage: string | null, required: boolean) =>
    current === "zh-CN"
      ? `${name}${dosage ? `（${dosage}）` : ""}${required ? "" : "（可选）"}`
      : `${name}${dosage ? ` — ${dosage}` : ""}${required ? "" : " (optional)"}`,
  medicationStatusLabel: (
    name: string,
    dosage: string | null,
    status: string,
  ) =>
    current === "zh-CN"
      ? `${name}${dosage ? `（${dosage}）` : ""}：${status}`
      : `${name}${dosage ? ` — ${dosage}` : ""}: ${status}`,
  correctionPrompt: (name: string, day: string) =>
    current === "zh-CN"
      ? `要更正 ${day}「${name}」的记录吗？`
      : `Correct ${name} for ${day}?`,
  groupCorrectionPrompt: (day: string) =>
    current === "zh-CN"
      ? `要更正 ${day} 的全部药物记录吗？`
      : `Correct all medications for ${day}?`,
  deleteMedicationPrompt: (name: string) =>
    current === "zh-CN"
      ? `确定永久删除「${name}」吗？已有记录会保留。`
      : `Permanently delete ${name}? Historical snapshots will be retained.`,
  testNotificationBody: () =>
    current === "zh-CN"
      ? "测试通知已正常送达。"
      : "Your test notification is working.",
  reminderBody: () =>
    current === "zh-CN"
      ? "该吃今晚的药了。"
      : "It’s time to take your medication.",
};
