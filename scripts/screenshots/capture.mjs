import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const root = new URL("../../", import.meta.url).pathname;
const output = new URL("../../docs/images/", import.meta.url).pathname;
const chineseOutput = `${output}zh/`;
const origin = "http://127.0.0.1:4173";
const today = "2026-07-21";
const medicationId = "00000000-0000-4000-8000-000000000001";
const sessionToken = randomBytes(24).toString("base64url");
let completed = false;
let theme = "light";
let fixtureLanguage = "en";
const medicationName = () =>
  fixtureLanguage === "zh-CN" ? "晚间用药" : "Evening Medication";

const shiftDay = (day, offset) => {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};
const missed = new Set([
  "2026-07-06",
  "2026-07-13",
  "2026-07-14",
  "2026-07-15",
]);
const takenAt = (day) =>
  day === "2026-07-12"
    ? "2026-07-13T08:30:00.000Z"
    : `${shiftDay(day, 1)}T05:05:00.000Z`;
const historyDay = (day) => {
  const future = day > today;
  const taken = !future && day >= "2026-06-22" && !missed.has(day);
  const status = future ? "future" : taken ? "taken" : "missed";
  return {
    day,
    status,
    taken,
    takenAt: taken ? takenAt(day) : null,
    note: "",
    corrected: false,
    correctedAt: null,
    doses: [
      {
        id: medicationId,
        name: medicationName(),
        dosage: null,
        required: true,
        taken,
        takenAt: taken ? takenAt(day) : null,
      },
    ],
  };
};
const monthDays = () =>
  Array.from({ length: 31 }, (_, index) =>
    historyDay(`2026-07-${String(index + 1).padStart(2, "0")}`),
  );
const statisticDays = Array.from({ length: 30 }, (_, index) => {
  const day = shiftDay("2026-06-22", index);
  const taken = !missed.has(day);
  return {
    day,
    status: taken ? "taken" : "missed",
    required: 1,
    takenRequired: taken ? 1 : 0,
  };
});
const runs = statisticDays.reduce(
  (value, day) => {
    value.current = day.status === "taken" ? value.current + 1 : 0;
    value.longest = Math.max(value.longest, value.current);
    return value;
  },
  { current: 0, longest: 0 },
);
if (
  statisticDays.filter((day) => day.status === "taken").length !== 26 ||
  statisticDays.filter((day) => day.status === "missed").length !== 4 ||
  runs.current !== 6 ||
  runs.longest !== 14
)
  throw new Error("Synthetic screenshot history is inconsistent.");
const settings = () => ({
  startMinute: 1320,
  endMinute: 240,
  intervalMinute: 30,
  timezone: "America/Los_Angeles",
  timeZoneMode: "automatic",
  remindersEnabled: true,
  completionMode: "group",
  theme,
  quietPreference: false,
  badgePreference: true,
  previewText: "",
  preview: "Reminders every 30 minutes from 10:00 PM until 4:00 AM.",
});
const currentDay = () => ({
  ...historyDay(today),
  status: completed ? "taken" : "open",
  taken: completed,
  takenAt: completed ? "2026-07-22T05:05:00.000Z" : null,
  doses: [
    {
      id: medicationId,
      name: medicationName(),
      dosage: null,
      required: true,
      taken: completed,
      takenAt: completed ? "2026-07-22T05:05:00.000Z" : null,
    },
  ],
});
const statusPayload = () => ({
  day: today,
  serverTime: "2026-07-22T05:15:00.000Z",
  local: { year: 2026, month: 7, day: 21, hour: 22, minute: 15 },
  status: currentDay(),
  settings: settings(),
  medications: [
    {
      id: medicationId,
      name: medicationName(),
      dosage: null,
      instructions: null,
      enabled: 1,
      required: 1,
      display_order: 0,
      notes: null,
    },
  ],
  nextReminder: completed ? null : "10:30 PM",
  nextReminderMinute: completed ? null : 1350,
  reminderEnd: "4:00 AM",
  reminderEndMinute: 240,
  snoozeUntil: null,
  subscriptionActive: true,
  vapidPublicKey: "",
  diagnostics: {
    schemaVersion: 3,
    expectedTokenLength: null,
    lastSuccessfulPush: null,
    lastPushError: null,
    serviceWorkerVersion: "v10",
  },
  activeMedicationCount: 1,
});
const json = (data, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(data),
});

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      // The local server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Vite server did not start.");
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.getSelection()?.removeAllRanges();
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.waitForTimeout(300);
}

async function capture(page, filename, { fullPage = true } = {}) {
  await page.evaluate((captureFullPage) => {
    const navigation = document.querySelector(".bottom-nav");
    if (navigation instanceof HTMLElement)
      navigation.style.position = captureFullPage ? "static" : "fixed";
  }, fullPage);
  await settle(page);
  const path = `${output}${filename}`;
  await page.screenshot({
    path,
    fullPage,
    animations: "disabled",
    caret: "hide",
    scale: "device",
  });
  const optimized = await sharp(path)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  await sharp(optimized).toFile(path);
  return path;
}

async function createHero(prefix = "") {
  const sources = [
    "home-pending-light.png",
    "statistics-light.png",
    "settings-time-zone-light.png",
  ];
  const screens = await Promise.all(
    sources.map(async (name) => {
      const mask = Buffer.from(
        '<svg width="330" height="714"><rect width="330" height="714" rx="28" fill="white"/></svg>',
      );
      return sharp(`${output}${prefix}${name}`)
        .resize(330, 714, { fit: "cover", position: "top" })
        .composite([{ input: mask, blend: "dest-in" }])
        .png({ compressionLevel: 9 })
        .toBuffer();
    }),
  );
  const background = Buffer.from(`
    <svg width="1800" height="900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#18312d" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="1800" height="900" fill="#eef4f1"/>
      <text x="900" y="78" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700" fill="#18312d">PourMed</text>
      ${[280, 725, 1170]
        .map(
          (x) =>
            `<rect x="${x}" y="112" width="350" height="746" rx="38" fill="#18312d" filter="url(#shadow)"/>`,
        )
        .join("")}
    </svg>`);
  await sharp(background)
    .composite(
      screens.map((input, index) => ({
        input,
        left: [290, 735, 1180][index],
        top: 128,
      })),
    )
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(`${output}${prefix}pourmed-hero.png`);
}

await mkdir(output, { recursive: true });
await mkdir(chineseOutput, { recursive: true });
const server = spawn(
  "pnpm",
  ["exec", "vite", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  { cwd: root, stdio: "ignore" },
);
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      colorScheme: "light",
      locale: "en-US",
      timezoneId: "America/Los_Angeles",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      permissions: ["notifications"],
      serviceWorkers: "allow",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((token) => {
      localStorage.setItem("pourmed-token", token);
      const registration = {
        waiting: null,
        installing: null,
        update: async () => undefined,
        addEventListener: () => undefined,
        pushManager: {
          getSubscription: async () => ({ unsubscribe: async () => true }),
        },
      };
      Object.defineProperties(navigator.serviceWorker, {
        register: { configurable: true, value: async () => registration },
        getRegistration: {
          configurable: true,
          value: async () => registration,
        },
        ready: { configurable: true, get: () => Promise.resolve(registration) },
      });
      Object.defineProperty(Notification, "permission", {
        configurable: true,
        get: () => "granted",
      });
      const nativeMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const result = nativeMatchMedia(query);
        if (query === "(display-mode: standalone)")
          Object.defineProperty(result, "matches", { value: true });
        return result;
      };
    }, sessionToken);
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === "/api/status")
        return route.fulfill(json({ ok: true, data: statusPayload() }));
      if (url.pathname === "/api/history")
        return route.fulfill(json({ ok: true, data: { days: monthDays() } }));
      if (url.pathname === "/api/statistics")
        return route.fulfill(
          json({
            ok: true,
            data: {
              today,
              days: statisticDays,
              definition: "Completed days divided by scheduled days.",
            },
          }),
        );
      if (url.pathname === "/api/taken" && request.method() === "POST") {
        completed = true;
        return route.fulfill(json({ ok: true, data: currentDay() }));
      }
      return route.fulfill(json({ ok: true, data: {} }));
    });
    await page.clock.install({ time: new Date("2026-07-22T05:15:00.000Z") });
    await page.goto(origin, { waitUntil: "networkidle" });
    await page
      .locator("#status")
      .filter({ hasText: "Not taken yet" })
      .waitFor();
    await page.evaluate(() => {
      const token = document.querySelector("#token");
      if (token instanceof HTMLInputElement) token.value = "";
      window.scrollTo(0, 0);
    });
    await capture(page, "home-pending-light.png");

    await page.locator("#taken").click();
    await page
      .locator("#status")
      .filter({ hasText: "Taken tonight" })
      .waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "home-completed-light.png");

    await page.locator('[data-view="history"]').click();
    await page.getByRole("heading", { name: "History" }).waitFor();
    await page
      .locator('#calendar button[aria-label^="Sunday, July 12"]')
      .click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "history-light.png");

    await page.locator('[data-view="stats"]').click();
    await page.getByRole("heading", { name: "Statistics" }).waitFor();
    await page.locator("#stats-period").selectOption("previous-30");
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "statistics-light.png");

    await page.locator('[data-view="settings"]').click();
    await page.getByRole("heading", { name: "Settings" }).waitFor();
    await page
      .locator('section[aria-labelledby="timezone-heading"]')
      .evaluate((section) => section.scrollIntoView({ block: "start" }));
    await capture(page, "settings-time-zone-light.png", { fullPage: false });

    await page.locator("#advanced-settings summary").click();
    await page
      .locator("#advanced-settings")
      .evaluate((details) => details.scrollIntoView({ block: "start" }));
    await capture(page, "notifications-status-light.png", { fullPage: false });

    completed = false;
    theme = "dark";
    await page.reload({ waitUntil: "networkidle" });
    await page
      .locator("#status")
      .filter({ hasText: "Not taken yet" })
      .waitFor();
    await page.evaluate(() => {
      const token = document.querySelector("#token");
      if (token instanceof HTMLInputElement) token.value = "";
      window.scrollTo(0, 0);
    });
    await capture(page, "home-pending-dark.png");

    completed = false;
    theme = "light";
    fixtureLanguage = "zh-CN";
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-view="settings"]').click();
    await page.locator("#language").selectOption("zh-CN");
    await page.getByRole("heading", { name: "设置" }).waitFor();
    await page.evaluate(() => {
      document
        .querySelectorAll(
          "#schedule-form > :not(section[aria-labelledby='language-heading']), #settings-view > section, #settings-view > details, #settings-view > dialog",
        )
        .forEach((element) => {
          if (element instanceof HTMLElement) element.style.display = "none";
        });
      window.scrollTo(0, 0);
    });
    await capture(page, "zh/settings-language-light.png", { fullPage: false });
    await page.evaluate(() => {
      document
        .querySelectorAll("#settings-view [style*='display: none']")
        .forEach((element) => {
          if (element instanceof HTMLElement)
            element.style.removeProperty("display");
        });
    });

    await page.locator('[data-view="today"]').click();
    await page.locator("#status").filter({ hasText: "还没吃" }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "zh/home-pending-light.png");

    await page.locator("#taken").click();
    await page.locator("#status").filter({ hasText: "今晚已完成" }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "zh/home-completed-light.png");

    await page.locator('[data-view="history"]').click();
    await page.getByRole("heading", { name: "记录" }).waitFor();
    await page.locator('#calendar button[aria-label*="2026年7月12日"]').click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "zh/history-light.png");

    await page.locator('[data-view="stats"]').click();
    await page.getByRole("heading", { name: "统计" }).waitFor();
    await page.locator("#stats-period").selectOption("previous-30");
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "zh/statistics-light.png");

    await page.locator('[data-view="settings"]').click();
    await page
      .locator('section[aria-labelledby="timezone-heading"]')
      .evaluate((section) => section.scrollIntoView({ block: "start" }));
    await capture(page, "zh/settings-time-zone-light.png", { fullPage: false });

    await page.locator("#advanced-settings summary").click();
    await page
      .locator("#advanced-settings")
      .evaluate((details) => details.scrollIntoView({ block: "start" }));
    await capture(page, "zh/notifications-status-light.png", {
      fullPage: false,
    });

    completed = false;
    theme = "dark";
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#status").filter({ hasText: "还没吃" }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, "zh/home-pending-dark.png");

    for (const width of [360, 1024]) {
      await page.setViewportSize({ width, height: width === 360 ? 780 : 900 });
      const overflow = await page.evaluate(
        () =>
          Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
          ) > window.innerWidth,
      );
      if (overflow) throw new Error(`Chinese layout overflows at ${width}px.`);
    }

    if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  } finally {
    await browser.close();
  }
  await createHero();
  await createHero("zh/");
} finally {
  server.kill("SIGTERM");
}

for (const name of [
  "pourmed-hero.png",
  "home-pending-light.png",
  "home-completed-light.png",
  "history-light.png",
  "statistics-light.png",
  "settings-time-zone-light.png",
  "notifications-status-light.png",
  "home-pending-dark.png",
  "zh/pourmed-hero.png",
  "zh/home-pending-light.png",
  "zh/home-completed-light.png",
  "zh/history-light.png",
  "zh/statistics-light.png",
  "zh/settings-language-light.png",
  "zh/settings-time-zone-light.png",
  "zh/notifications-status-light.png",
  "zh/home-pending-dark.png",
]) {
  const metadata = await sharp(`${output}${name}`).metadata();
  console.log(`${name}: ${metadata.width}x${metadata.height}`);
}
