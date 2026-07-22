import { DurableObject } from "cloudflare:workers";
import {
  buildPushPayload,
  type PushSubscription,
} from "@block65/webcrypto-web-push";
import {
  classifyDay,
  formatMinute,
  medicationDay,
  nextSlotMinute,
  schedulePreview,
  safeCsv,
  scheduledSlot,
  zonedParts,
  type CompletionMode,
  type DayStatus,
  type ScheduleSettings,
} from "../shared/domain";
import type { Env } from "./types";

const securityHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "geolocation=(), camera=(), microphone=()",
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};
const json = (
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...securityHeaders,
      "content-type": "application/json; charset=utf-8",
      ...extra,
    },
  });
const ok = (data: unknown) => json({ ok: true, data });
const err = (
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) => json({ ok: false, error: { code, message, ...details } }, status);
class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const bytes = (s: string) => new TextEncoder().encode(s);
const b64 = (a: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(a)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
async function authorized(req: Request, env: Env) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ") || h.length > 600) return false;
  const got = bytes(
      b64(await crypto.subtle.digest("SHA-256", bytes(h.slice(7)))),
    ),
    expected = bytes(env.ACCESS_TOKEN_HASH || "");
  let diff = got.length ^ expected.length;
  for (let i = 0; i < Math.max(got.length, expected.length); i++)
    diff |= (got[i % got.length] ?? 0) ^ (expected[i % expected.length] ?? 0);
  return diff === 0;
}
async function readJson(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.");
  const text = await req.text();
  if (text.length > 16384)
    throw new ApiError(413, "BODY_TOO_LARGE", "Request body is too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Malformed JSON.");
  }
}
const record = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new ApiError(400, "INVALID_INPUT", "Invalid request body.");
  return x as Record<string, unknown>;
};
const text = (x: unknown, name: string, max: number, optional = false) => {
  if ((x === null || x === undefined || x === "") && optional) return null;
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new ApiError(400, "INVALID_INPUT", `${name} is invalid.`);
  return x.trim();
};
function validSub(x: unknown): x is PushSubscription {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>,
    k = s.keys as Record<string, unknown> | undefined;
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    s.endpoint.length < 2048 &&
    !!k &&
    typeof k.p256dh === "string" &&
    typeof k.auth === "string" &&
    k.p256dh.length < 256 &&
    k.auth.length < 256
  );
}
const shiftDay = (day: string, offset: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

interface SettingsRow {
  [key: string]: SqlStorageValue;
  start_minute: number;
  end_minute: number;
  interval_minute: number;
  timezone: string;
  reminders_enabled: number;
  completion_mode: CompletionMode;
  theme: string;
  quiet_preference: number;
  badge_preference: number;
  preview_text: string;
}
interface MedicationRow {
  [key: string]: SqlStorageValue;
  id: string;
  name: string;
  dosage: string | null;
  instructions: string | null;
  enabled: number;
  required: number;
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
interface DoseRow {
  [key: string]: SqlStorageValue;
  medication_id: string;
  medication_name: string;
  dosage: string | null;
  required: number;
  taken: number;
  taken_at: string | null;
}

export class MedicationState extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.migrate());
  }
  private migrate() {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS days(day TEXT PRIMARY KEY,taken INTEGER NOT NULL DEFAULT 0,taken_at TEXT,last_changed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sent(slot TEXT PRIMARY KEY,sent_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS schema_meta(version INTEGER NOT NULL);
    INSERT INTO schema_meta(version) SELECT 2 WHERE NOT EXISTS(SELECT 1 FROM schema_meta);
    CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),start_minute INTEGER NOT NULL,end_minute INTEGER NOT NULL,interval_minute INTEGER NOT NULL,timezone TEXT NOT NULL,reminders_enabled INTEGER NOT NULL,completion_mode TEXT NOT NULL,theme TEXT NOT NULL,quiet_preference INTEGER NOT NULL,badge_preference INTEGER NOT NULL,preview_text TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT OR IGNORE INTO settings VALUES(1,1320,240,30,'America/Los_Angeles',1,'group','system',0,1,'',CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS medications(id TEXT PRIMARY KEY,name TEXT NOT NULL,dosage TEXT,instructions TEXT,enabled INTEGER NOT NULL,required INTEGER NOT NULL,display_order INTEGER NOT NULL,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS day_records(day TEXT PRIMARY KEY,legacy_taken INTEGER NOT NULL DEFAULT 0,legacy_taken_at TEXT,note TEXT,corrected INTEGER NOT NULL DEFAULT 0,corrected_at TEXT,updated_at TEXT NOT NULL);
    INSERT OR IGNORE INTO day_records(day,legacy_taken,legacy_taken_at,updated_at) SELECT day,taken,taken_at,last_changed_at FROM days;
    CREATE TABLE IF NOT EXISTS day_doses(day TEXT NOT NULL,medication_id TEXT NOT NULL,medication_name TEXT NOT NULL,dosage TEXT,required INTEGER NOT NULL,taken INTEGER NOT NULL DEFAULT 0,taken_at TEXT,corrected_at TEXT,PRIMARY KEY(day,medication_id));
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,day TEXT NOT NULL,medication_id TEXT,action TEXT NOT NULL,occurred_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reminder_slots(slot TEXT PRIMARY KEY,day TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL,error_code TEXT,updated_at TEXT NOT NULL);
    INSERT OR IGNORE INTO reminder_slots(slot,day,status,attempts,updated_at) SELECT slot,substr(slot,1,10),'delivered',1,sent_at FROM sent;
    CREATE TABLE IF NOT EXISTS snoozes(day TEXT PRIMARY KEY,until_epoch INTEGER NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS idempotency(key TEXT PRIMARY KEY,response TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS push_events(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,status TEXT NOT NULL,error_code TEXT,occurred_at TEXT NOT NULL);
  `);
    });
  }
  private settings(): ScheduleSettings & {
    theme: string;
    quietPreference: boolean;
    badgePreference: boolean;
    previewText: string;
  } {
    const r = [
      ...this.ctx.storage.sql.exec<SettingsRow>(
        "SELECT * FROM settings WHERE id=1",
      ),
    ][0]!;
    return {
      startMinute: r.start_minute,
      endMinute: r.end_minute,
      intervalMinute: r.interval_minute as ScheduleSettings["intervalMinute"],
      timezone: r.timezone,
      remindersEnabled: !!r.reminders_enabled,
      completionMode: r.completion_mode,
      theme: r.theme,
      quietPreference: !!r.quiet_preference,
      badgePreference: !!r.badge_preference,
      previewText: r.preview_text,
    };
  }
  private medications(enabledOnly = false) {
    return [
      ...this.ctx.storage.sql.exec<MedicationRow>(
        `SELECT * FROM medications ${enabledOnly ? "WHERE enabled=1" : ""} ORDER BY display_order,name`,
      ),
    ];
  }
  private ensureDay(day: string, now: string) {
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO day_records(day,updated_at) VALUES(?,?)",
      day,
      now,
    );
    for (const m of this.medications(true))
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO day_doses(day,medication_id,medication_name,dosage,required) VALUES(?,?,?,?,?)",
        day,
        m.id,
        m.name,
        m.dosage,
        m.required,
      );
  }
  private day(day: string, today: string, windowOpen: boolean) {
    const r = [
      ...this.ctx.storage.sql.exec<{
        legacy_taken: number;
        legacy_taken_at: string | null;
        note: string | null;
        corrected: number;
        corrected_at: string | null;
      }>(
        "SELECT legacy_taken,legacy_taken_at,note,corrected,corrected_at FROM day_records WHERE day=?",
        day,
      ),
    ][0];
    const doses = [
      ...this.ctx.storage.sql.exec<DoseRow>(
        "SELECT medication_id,medication_name,dosage,required,taken,taken_at FROM day_doses WHERE day=? ORDER BY medication_name",
        day,
      ),
    ];
    const simple = doses.map((d) => ({
      required: !!d.required,
      taken: !!d.taken,
    }));
    const status = classifyDay(
      day,
      today,
      windowOpen,
      simple,
      this.settings().completionMode,
      !!r?.legacy_taken,
    );
    const takenAt =
      r?.legacy_taken_at ??
      doses
        .filter((d) => d.taken_at)
        .map((d) => d.taken_at!)
        .sort()
        .at(-1) ??
      null;
    return {
      day,
      status,
      taken: status === "taken",
      takenAt,
      note: r?.note ?? "",
      corrected: !!r?.corrected,
      correctedAt: r?.corrected_at ?? null,
      doses: doses.map((d) => ({
        id: d.medication_id,
        name: d.medication_name,
        dosage: d.dosage,
        required: !!d.required,
        taken: !!d.taken,
        takenAt: d.taken_at,
      })),
    };
  }
  private active(now = new Date()) {
    const settings = this.settings(),
      local = zonedParts(now, settings.timezone),
      day = medicationDay(local),
      minute = local.hour * 60 + local.minute,
      duration =
        settings.endMinute >= settings.startMinute
          ? settings.endMinute - settings.startMinute
          : 1440 - settings.startMinute + settings.endMinute,
      offset =
        minute >= settings.startMinute
          ? minute - settings.startMinute
          : 1440 - settings.startMinute + minute,
      windowOpen = offset <= duration;
    this.ensureDay(day, now.toISOString());
    const snooze =
      [
        ...this.ctx.storage.sql.exec<{ until_epoch: number }>(
          "SELECT until_epoch FROM snoozes WHERE day=?",
          day,
        ),
      ][0]?.until_epoch ?? null;
    return {
      settings,
      local,
      day,
      windowOpen,
      snoozeUntil: snooze ? new Date(snooze).toISOString() : null,
    };
  }
  private mutationLimit() {
    const key = `mutation:${Math.floor(Date.now() / 60000)}`,
      row = [
        ...this.ctx.storage.sql.exec<{ value: string }>(
          "SELECT value FROM config WHERE key=?",
          key,
        ),
      ][0],
      count = Number(row?.value ?? 0);
    if (count >= 40)
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Too many changes. Wait one minute.",
      );
    this.ctx.storage.sql.exec(
      "INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      key,
      String(count + 1),
    );
  }
  private idem(req: Request) {
    const key = req.headers.get("idempotency-key");
    if (!key) return null;
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(key))
      throw new ApiError(
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "Invalid idempotency key.",
      );
    const found = [
      ...this.ctx.storage.sql.exec<{ response: string }>(
        "SELECT response FROM idempotency WHERE key=?",
        key,
      ),
    ][0];
    return { key, response: found ? JSON.parse(found.response) : null };
  }
  private saveIdem(key: string | null, data: unknown, now: string) {
    if (key)
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO idempotency VALUES(?,?,?)",
        key,
        JSON.stringify(data),
        now,
      );
  }
  private async push(test = false) {
    const preferences = this.settings();
    const raw = [
      ...this.ctx.storage.sql.exec<{ value: string }>(
        "SELECT value FROM config WHERE key='subscription'",
      ),
    ][0]?.value;
    if (!raw) return { ok: false, code: "SUBSCRIPTION_MISSING" };
    const sub = JSON.parse(raw) as PushSubscription;
    try {
      const payload = await buildPushPayload(
        {
          data: JSON.stringify({
            title: "PourMed",
            body: test
              ? "Your test notification is working."
              : preferences.previewText || "It’s time to take your medication.",
            url: "/",
            quiet: preferences.quietPreference,
            badge: preferences.badgePreference,
          }),
          options: { ttl: 300 },
        },
        sub,
        {
          subject: this.env.VAPID_SUBJECT,
          publicKey: this.env.VAPID_PUBLIC_KEY,
          privateKey: this.env.VAPID_PRIVATE_KEY,
        },
      );
      const res = await fetch(sub.endpoint, payload);
      if (res.status === 404 || res.status === 410) {
        this.ctx.storage.sql.exec(
          "DELETE FROM config WHERE key='subscription'",
        );
        return { ok: false, code: "SUBSCRIPTION_EXPIRED", permanent: true };
      }
      if (!res.ok) return { ok: false, code: "PUSH_TRANSIENT_FAILURE" };
      return { ok: true };
    } catch {
      return { ok: false, code: "PUSH_FAILED" };
    }
  }
  private async delayedTestPush() {
    await new Promise<void>((resolve) => setTimeout(resolve, 10000));
    const result = await this.push(true),
      now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      "INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      result.ok ? "last_push_at" : "last_push_error",
      result.ok ? now : result.code,
    );
  }
  private async scheduled(now: Date) {
    const a = this.active(now),
      dayState = this.day(a.day, a.day, a.windowOpen);
    if (!a.settings.remindersEnabled) return { sent: false, reason: "PAUSED" };
    if (dayState.taken) return { sent: false, reason: "COMPLETE" };
    const snoozeEpoch = a.snoozeUntil ? Date.parse(a.snoozeUntil) : null;
    let slot: string | null = null;
    if (snoozeEpoch && now.getTime() < snoozeEpoch)
      return { sent: false, reason: "SNOOZED" };
    if (snoozeEpoch) {
      slot = `${a.day}@snooze:${snoozeEpoch}`;
      this.ctx.storage.sql.exec("DELETE FROM snoozes WHERE day=?", a.day);
    } else {
      const failed = [
        ...this.ctx.storage.sql.exec<{ slot: string }>(
          "SELECT slot FROM reminder_slots WHERE day=? AND status='failed' AND attempts<3 AND updated_at>=? ORDER BY updated_at LIMIT 1",
          a.day,
          new Date(now.getTime() - 10 * 60000).toISOString(),
        ),
      ][0];
      slot = failed?.slot ?? scheduledSlot(a.local, a.settings);
    }
    if (!slot) return { sent: false, reason: "NOT_A_SLOT" };
    const existing = [
      ...this.ctx.storage.sql.exec<{ status: string; attempts: number }>(
        "SELECT status,attempts FROM reminder_slots WHERE slot=?",
        slot,
      ),
    ][0];
    if (
      existing &&
      (existing.status === "delivered" ||
        existing.status === "sending" ||
        existing.attempts >= 3)
    )
      return { sent: false, reason: "DUPLICATE" };
    const attempts = (existing?.attempts ?? 0) + 1;
    this.ctx.storage.sql.exec(
      "INSERT INTO reminder_slots VALUES(?,?, 'sending',?,NULL,?) ON CONFLICT(slot) DO UPDATE SET status='sending',attempts=?,error_code=NULL,updated_at=?",
      slot,
      a.day,
      attempts,
      now.toISOString(),
      attempts,
      now.toISOString(),
    );
    const result = await this.push();
    const status = result.ok ? "delivered" : "failed";
    this.ctx.storage.sql.exec(
      "UPDATE reminder_slots SET status=?,error_code=?,updated_at=? WHERE slot=?",
      status,
      result.ok ? null : result.code,
      now.toISOString(),
      slot,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO push_events(kind,status,error_code,occurred_at) VALUES('reminder',?,?,?)",
      status,
      result.ok ? null : result.code,
      now.toISOString(),
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      result.ok ? "last_push_at" : "last_push_error",
      result.ok ? now.toISOString() : result.code,
    );
    return { sent: result.ok, reason: result.ok ? "SENT" : result.code };
  }
  private bootstrap(now = new Date()) {
    const a = this.active(now),
      state = this.day(a.day, a.day, a.windowOpen),
      active = this.medications(true),
      next = nextSlotMinute(a.local.hour * 60 + a.local.minute, a.settings);
    const subscription =
      [
        ...this.ctx.storage.sql.exec(
          "SELECT value FROM config WHERE key='subscription'",
        ),
      ].length > 0;
    const lastPush =
        [
          ...this.ctx.storage.sql.exec<{ value: string }>(
            "SELECT value FROM config WHERE key='last_push_at'",
          ),
        ][0]?.value ?? null,
      lastError =
        [
          ...this.ctx.storage.sql.exec<{ value: string }>(
            "SELECT value FROM config WHERE key='last_push_error'",
          ),
        ][0]?.value ?? null;
    return {
      day: a.day,
      serverTime: now.toISOString(),
      local: a.local,
      status: state,
      settings: { ...a.settings, preview: schedulePreview(a.settings) },
      medications: this.medications(),
      nextReminder: state.taken
        ? null
        : (a.snoozeUntil ?? (next === null ? null : formatMinute(next))),
      reminderEnd: formatMinute(a.settings.endMinute),
      snoozeUntil: a.snoozeUntil,
      subscriptionActive: subscription,
      vapidPublicKey: this.env.VAPID_PUBLIC_KEY,
      diagnostics: {
        schemaVersion: 2,
        expectedTokenLength: Number(this.env.ACCESS_TOKEN_LENGTH) || null,
        lastSuccessfulPush: lastPush,
        lastPushError: lastError,
        serviceWorkerVersion: "v8",
      },
      activeMedicationCount: active.length,
    };
  }
  private history(now = new Date(), count = 30) {
    const a = this.active(now),
      out = [];
    for (let i = count - 1; i >= 0; i--) {
      const day = shiftDay(a.day, -i);
      out.push(this.day(day, a.day, day === a.day && a.windowOpen));
    }
    return out;
  }
  private monthHistory(month: string, now = new Date()) {
    const [year, monthNumber] = month.split("-").map(Number),
      count = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate(),
      a = this.active(now),
      out = [];
    for (let dayNumber = 1; dayNumber <= count; dayNumber++) {
      const day = `${month}-${String(dayNumber).padStart(2, "0")}`;
      out.push(this.day(day, a.day, day === a.day && a.windowOpen));
    }
    return out;
  }
  async fetch(req: Request) {
    const url = new URL(req.url),
      now = new Date();
    try {
      if (url.pathname === "/internal/scheduled")
        return ok(await this.scheduled(now));
      if (url.pathname === "/internal/auth-failed") {
        const key = `auth:${Math.floor(Date.now() / 60000)}`,
          count = Number(
            [
              ...this.ctx.storage.sql.exec<{ value: string }>(
                "SELECT value FROM config WHERE key=?",
                key,
              ),
            ][0]?.value ?? 0,
          );
        this.ctx.storage.sql.exec(
          "INSERT INTO config VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          key,
          String(count + 1),
        );
        return ok({ limited: count >= 9 });
      }
      if (url.pathname === "/api/status" && req.method === "GET")
        return ok(this.bootstrap(now));
      if (url.pathname === "/api/settings" && req.method === "PUT") {
        this.mutationLimit();
        const x = record(await readJson(req));
        const start = Number(x.startMinute),
          end = Number(x.endMinute),
          interval = Number(x.intervalMinute),
          timezone = text(x.timezone, "Timezone", 100)!,
          mode = x.completionMode,
          theme = x.theme;
        if (
          !Number.isInteger(start) ||
          start < 0 ||
          start > 1439 ||
          !Number.isInteger(end) ||
          end < 0 ||
          end > 1439 ||
          ![10, 15, 20, 30, 45, 60].includes(interval) ||
          !["group", "individual"].includes(String(mode)) ||
          !["light", "dark", "system"].includes(String(theme))
        )
          throw new ApiError(
            400,
            "INVALID_SETTINGS",
            "Schedule settings are invalid.",
          );
        try {
          new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
        } catch {
          throw new ApiError(400, "INVALID_TIMEZONE", "Timezone is invalid.");
        }
        this.ctx.storage.sql.exec(
          "UPDATE settings SET start_minute=?,end_minute=?,interval_minute=?,timezone=?,reminders_enabled=?,completion_mode=?,theme=?,quiet_preference=?,badge_preference=?,preview_text=?,updated_at=? WHERE id=1",
          start,
          end,
          interval,
          timezone,
          x.remindersEnabled ? 1 : 0,
          mode,
          theme,
          x.quietPreference ? 1 : 0,
          x.badgePreference === false ? 0 : 1,
          text(x.previewText, "Preview text", 120, true) ?? "",
          now.toISOString(),
        );
        return ok(this.bootstrap(now));
      }
      if (url.pathname === "/api/medications" && req.method === "POST") {
        this.mutationLimit();
        const x = record(await readJson(req)),
          id = crypto.randomUUID(),
          name = text(x.name, "Name", 100)!,
          order = Number(
            [
              ...this.ctx.storage.sql.exec<{ n: number }>(
                "SELECT COALESCE(MAX(display_order),-1)+1 n FROM medications",
              ),
            ][0]?.n ?? 0,
          );
        this.ctx.storage.sql.exec(
          "INSERT INTO medications VALUES(?,?,?,?,1,?,?,?,?,?)",
          id,
          name,
          text(x.dosage, "Dosage", 100, true),
          text(x.instructions, "Instructions", 500, true),
          x.required === false ? 0 : 1,
          order,
          text(x.notes, "Notes", 1000, true),
          now.toISOString(),
          now.toISOString(),
        );
        this.ensureDay(this.active(now).day, now.toISOString());
        return ok({ medications: this.medications() });
      }
      const medMatch = url.pathname.match(
        /^\/api\/medications\/([0-9a-f-]{36})$/,
      );
      if (medMatch && req.method === "PUT") {
        this.mutationLimit();
        const x = record(await readJson(req)),
          id = medMatch[1]!;
        if (
          ![
            ...this.ctx.storage.sql.exec(
              "SELECT id FROM medications WHERE id=?",
              id,
            ),
          ].length
        )
          throw new ApiError(
            404,
            "MEDICATION_NOT_FOUND",
            "Medication not found.",
          );
        this.ctx.storage.sql.exec(
          "UPDATE medications SET name=?,dosage=?,instructions=?,enabled=?,required=?,notes=?,updated_at=? WHERE id=?",
          text(x.name, "Name", 100),
          text(x.dosage, "Dosage", 100, true),
          text(x.instructions, "Instructions", 500, true),
          x.enabled === false ? 0 : 1,
          x.required === false ? 0 : 1,
          text(x.notes, "Notes", 1000, true),
          now.toISOString(),
          id,
        );
        const currentDay = this.active(now).day;
        if (x.enabled === false)
          this.ctx.storage.sql.exec(
            "DELETE FROM day_doses WHERE day=? AND medication_id=?",
            currentDay,
            id,
          );
        else {
          this.ensureDay(currentDay, now.toISOString());
          this.ctx.storage.sql.exec(
            "UPDATE day_doses SET medication_name=?,dosage=?,required=? WHERE day=? AND medication_id=?",
            text(x.name, "Name", 100),
            text(x.dosage, "Dosage", 100, true),
            x.required === false ? 0 : 1,
            currentDay,
            id,
          );
        }
        return ok({ medications: this.medications() });
      }
      if (medMatch && req.method === "DELETE") {
        this.mutationLimit();
        this.ctx.storage.sql.exec(
          "DELETE FROM day_doses WHERE day=? AND medication_id=?",
          this.active(now).day,
          medMatch[1]!,
        );
        this.ctx.storage.sql.exec(
          "DELETE FROM medications WHERE id=?",
          medMatch[1]!,
        );
        return ok({ medications: this.medications() });
      }
      if (
        url.pathname === "/api/medications/reorder" &&
        req.method === "POST"
      ) {
        this.mutationLimit();
        const ids = record(await readJson(req)).ids;
        if (
          !Array.isArray(ids) ||
          ids.length > 100 ||
          ids.some((x) => typeof x !== "string")
        )
          throw new ApiError(
            400,
            "INVALID_ORDER",
            "Medication order is invalid.",
          );
        this.ctx.storage.transactionSync(() =>
          ids.forEach((id, i) =>
            this.ctx.storage.sql.exec(
              "UPDATE medications SET display_order=?,updated_at=? WHERE id=?",
              i,
              now.toISOString(),
              id,
            ),
          ),
        );
        return ok({ medications: this.medications() });
      }
      if (
        (url.pathname === "/api/taken" || url.pathname === "/api/not-taken") &&
        req.method === "POST"
      ) {
        this.mutationLimit();
        const idem = this.idem(req);
        if (idem?.response) return ok(idem.response);
        const x = record(await readJson(req)),
          a = this.active(now),
          day = typeof x.day === "string" ? x.day : a.day;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
          throw new ApiError(400, "INVALID_DAY", "Medication day is invalid.");
        this.ensureDay(day, now.toISOString());
        const take =
            url.pathname.endsWith("/taken") &&
            !url.pathname.endsWith("not-taken"),
          medId = typeof x.medicationId === "string" ? x.medicationId : null;
        if (medId)
          this.ctx.storage.sql.exec(
            "UPDATE day_doses SET taken=?,taken_at=?,corrected_at=? WHERE day=? AND medication_id=?",
            take ? 1 : 0,
            take ? now.toISOString() : null,
            day !== a.day ? now.toISOString() : null,
            day,
            medId,
          );
        else {
          this.ctx.storage.sql.exec(
            "UPDATE day_doses SET taken=?,taken_at=?,corrected_at=? WHERE day=?",
            take ? 1 : 0,
            take ? now.toISOString() : null,
            day !== a.day ? now.toISOString() : null,
            day,
          );
          this.ctx.storage.sql.exec(
            "INSERT INTO days(day,taken,taken_at,last_changed_at) VALUES(?,?,?,?) ON CONFLICT(day) DO UPDATE SET taken=excluded.taken,taken_at=CASE WHEN excluded.taken=1 THEN COALESCE(days.taken_at,excluded.taken_at) ELSE days.taken_at END,last_changed_at=excluded.last_changed_at",
            day,
            take ? 1 : 0,
            take ? now.toISOString() : null,
            now.toISOString(),
          );
          this.ctx.storage.sql.exec(
            "UPDATE day_records SET legacy_taken=?,legacy_taken_at=CASE WHEN ?=1 THEN COALESCE(legacy_taken_at,?) ELSE legacy_taken_at END,corrected=CASE WHEN ? THEN 1 ELSE corrected END,corrected_at=CASE WHEN ? THEN ? ELSE corrected_at END,updated_at=? WHERE day=?",
            take ? 1 : 0,
            take ? 1 : 0,
            now.toISOString(),
            day !== a.day || !take,
            day !== a.day || !take,
            now.toISOString(),
            now.toISOString(),
            day,
          );
        }
        this.ctx.storage.sql.exec(
          "INSERT INTO audit(day,medication_id,action,occurred_at) VALUES(?,?,?,?)",
          day,
          medId,
          take ? "taken" : "not_taken",
          now.toISOString(),
        );
        const result = this.day(day, a.day, day === a.day && a.windowOpen);
        this.saveIdem(idem?.key ?? null, result, now.toISOString());
        return ok(result);
      }
      if (url.pathname === "/api/day-note" && req.method === "PUT") {
        this.mutationLimit();
        const x = record(await readJson(req)),
          day = text(x.day, "Day", 10)!,
          note = text(x.note, "Note", 1000, true) ?? "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
          throw new ApiError(400, "INVALID_DAY", "Medication day is invalid.");
        this.ensureDay(day, now.toISOString());
        this.ctx.storage.sql.exec(
          "UPDATE day_records SET note=?,corrected=1,corrected_at=?,updated_at=? WHERE day=?",
          note,
          now.toISOString(),
          now.toISOString(),
          day,
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO audit(day,action,occurred_at) VALUES(?,'note_updated',?)",
          day,
          now.toISOString(),
        );
        return ok({ saved: true });
      }
      if (url.pathname === "/api/snooze" && req.method === "POST") {
        this.mutationLimit();
        const x = record(await readJson(req)),
          minutes = Number(x.minutes);
        if (![10, 20, 30, 60].includes(minutes))
          throw new ApiError(
            400,
            "INVALID_SNOOZE",
            "Snooze duration is invalid.",
          );
        const a = this.active(now),
          until = now.getTime() + minutes * 60000;
        this.ctx.storage.sql.exec(
          "INSERT INTO snoozes VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET until_epoch=excluded.until_epoch,created_at=excluded.created_at",
          a.day,
          until,
          now.toISOString(),
        );
        return ok({ snoozeUntil: new Date(until).toISOString() });
      }
      if (url.pathname === "/api/snooze" && req.method === "DELETE") {
        const a = this.active(now);
        this.ctx.storage.sql.exec("DELETE FROM snoozes WHERE day=?", a.day);
        return ok({ snoozeUntil: null });
      }
      if (url.pathname === "/api/history" && req.method === "GET") {
        const month = url.searchParams.get("month");
        if (month) {
          if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
            throw new ApiError(
              400,
              "INVALID_MONTH",
              "History month is invalid.",
            );
          return ok({ days: this.monthHistory(month, now) });
        }
        const count = Math.min(
          366,
          Math.max(1, Number(url.searchParams.get("count") ?? 30)),
        );
        return ok({ days: this.history(now, count) });
      }
      const dayMatch = url.pathname.match(
        /^\/api\/history\/(\d{4}-\d{2}-\d{2})$/,
      );
      if (dayMatch && req.method === "GET") {
        const a = this.active(now);
        return ok(
          this.day(dayMatch[1]!, a.day, dayMatch[1] === a.day && a.windowOpen),
        );
      }
      if (url.pathname === "/api/statistics" && req.method === "GET") {
        const active = this.active(now),
          earliest = [
            ...this.ctx.storage.sql.exec<{ day: string | null }>(
              "SELECT MIN(day) day FROM (SELECT day FROM day_records UNION ALL SELECT day FROM days)",
            ),
          ][0]?.day,
          first = earliest && earliest < active.day ? earliest : active.day,
          count =
            Math.round(
              (Date.parse(`${active.day}T00:00:00Z`) -
                Date.parse(`${first}T00:00:00Z`)) /
                86400000,
            ) + 1,
          days = this.history(now, count),
          summaries = days.map((d) => ({
            day: d.day,
            status: d.status as DayStatus,
            required:
              d.doses.filter((x) => x.required).length ||
              (d.status !== "none" ? 1 : 0),
            takenRequired:
              d.doses.filter((x) => x.required && x.taken).length ||
              (d.taken ? 1 : 0),
          }));
        return ok({
          today: active.day,
          days: summaries,
          definition:
            this.settings().completionMode === "group"
              ? "Completed days divided by scheduled days."
              : "Completed required doses divided by scheduled required doses.",
        });
      }
      if (url.pathname === "/api/export" && req.method === "GET") {
        const days = this.history(now, 366),
          settings = this.settings(),
          medications = this.medications();
        if (url.searchParams.get("format") === "csv") {
          const rows = ["day,status,medication,required,taken,taken_at,note"];
          for (const d of days)
            for (const dose of d.doses.length
              ? d.doses
              : [
                  {
                    name: "",
                    required: false,
                    taken: d.taken,
                    takenAt: d.takenAt,
                  },
                ])
              rows.push(
                [
                  d.day,
                  d.status,
                  dose.name,
                  String(dose.required),
                  String(dose.taken),
                  dose.takenAt ?? "",
                  d.note,
                ]
                  .map((v) => safeCsv(String(v)))
                  .join(","),
              );
          return new Response(rows.join("\n"), {
            headers: {
              ...securityHeaders,
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": "attachment; filename=pourmed-history.csv",
            },
          });
        }
        return ok({
          schemaVersion: 2,
          exportedAt: now.toISOString(),
          settings,
          medications,
          history: days,
        });
      }
      if (url.pathname === "/api/push/subscribe" && req.method === "POST") {
        const x = await readJson(req);
        if (!validSub(x))
          throw new ApiError(
            400,
            "INVALID_SUBSCRIPTION",
            "The push subscription is invalid.",
          );
        this.ctx.storage.sql.exec(
          "INSERT INTO config(key,value) VALUES('subscription',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          JSON.stringify(x),
        );
        return ok({ subscriptionActive: true });
      }
      if (url.pathname === "/api/push/subscribe" && req.method === "DELETE") {
        this.ctx.storage.sql.exec(
          "DELETE FROM config WHERE key='subscription'",
        );
        return ok({ subscriptionActive: false });
      }
      if (url.pathname === "/api/push/test" && req.method === "POST") {
        await readJson(req);
        const last = Number(
          [
            ...this.ctx.storage.sql.exec<{ value: string }>(
              "SELECT value FROM config WHERE key='last_test'",
            ),
          ][0]?.value ?? 0,
        );
        if (Date.now() - last < 60000)
          throw new ApiError(
            429,
            "RATE_LIMITED",
            "Wait one minute before another test.",
          );
        this.ctx.storage.sql.exec(
          "INSERT INTO config VALUES('last_test',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          String(Date.now()),
        );
        const result = await this.push(true);
        return result.ok
          ? ok({ sent: true })
          : err(
              result.code ?? "PUSH_FAILED",
              "The test notification could not be sent.",
              result.code === "SUBSCRIPTION_EXPIRED" ? 410 : 502,
            );
      }
      if (url.pathname === "/api/push/test-delayed" && req.method === "POST") {
        await readJson(req);
        const subscription = [
            ...this.ctx.storage.sql.exec(
              "SELECT value FROM config WHERE key='subscription'",
            ),
          ][0],
          last = Number(
            [
              ...this.ctx.storage.sql.exec<{ value: string }>(
                "SELECT value FROM config WHERE key='last_delayed_test'",
              ),
            ][0]?.value ?? 0,
          );
        if (!subscription)
          throw new ApiError(
            409,
            "SUBSCRIPTION_MISSING",
            "Enable notifications before scheduling a delayed test.",
          );
        if (Date.now() - last < 60000)
          throw new ApiError(
            429,
            "RATE_LIMITED",
            "Wait one minute before another delayed test.",
          );
        this.ctx.storage.sql.exec(
          "INSERT INTO config VALUES('last_delayed_test',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          String(Date.now()),
        );
        this.ctx.waitUntil(this.delayedTestPush());
        return ok({ scheduled: true, delaySeconds: 10 });
      }
      return err("NOT_FOUND", "Not found.", 404);
    } catch (e) {
      return e instanceof ApiError
        ? err(e.code, e.message, e.status)
        : err("INTERNAL_ERROR", "The request could not be completed.", 500);
    }
  }
}

export default {
  async fetch(req: Request, env: Env) {
    const u = new URL(req.url);
    if (u.pathname === "/api/health")
      return ok({ service: "pourmed", version: "1.0.0" });
    if (u.pathname.startsWith("/api/")) {
      const state = env.MEDICATION_STATE.get(
        env.MEDICATION_STATE.idFromName("single-user"),
      );
      if (!(await authorized(req, env))) {
        const result = (await (
          await state.fetch("https://internal/internal/auth-failed")
        ).json()) as { data?: { limited?: boolean } };
        return result.data?.limited
          ? err("RATE_LIMITED", "Too many failed authentication attempts.", 429)
          : err("UNAUTHORIZED", "Authentication required.", 401, {
              expectedTokenLength: Number(env.ACCESS_TOKEN_LENGTH) || null,
            });
      }
      return state.fetch(req);
    }
    const res = await env.ASSETS.fetch(req),
      h = new Headers(res.headers);
    Object.entries(securityHeaders).forEach(([k, v]) => {
      if (!h.has(k)) h.set(k, v);
    });
    if (u.protocol === "https:")
      h.set("strict-transport-security", "max-age=31536000; includeSubDomains");
    return new Response(res.body, { status: res.status, headers: h });
  },
  async scheduled(_c: ScheduledController, env: Env) {
    await env.MEDICATION_STATE.get(
      env.MEDICATION_STATE.idFromName("single-user"),
    ).fetch("https://internal/internal/scheduled");
  },
} satisfies ExportedHandler<Env>;
