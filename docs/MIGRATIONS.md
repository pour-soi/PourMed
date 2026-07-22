# Durable Object migrations

## v1.2 language preference

No database migration is required for v1.2. The device preference is stored locally for immediate startup, while the current notification language uses the existing Durable Object `config` key-value table. Medication history, settings rows, reminder slots, time-zone data, statistics, credentials, and the existing Web Push subscription are not rewritten.

## v3 time-zone mode

The v3 migration adds one non-null `time_zone_mode` column to `settings`, defaulting existing installations to `automatic`. It is additive and idempotent. Existing IANA time zones, medication-day keys, history, reminder slots, subscriptions, and credentials are retained unchanged; there is no historical data conversion.

## v1 to v2

The v2 migration runs inside the existing named SQLite Durable Object. It is additive and idempotent: it retains v1 `days`, `sent`, and `config`, creates schema/settings/medication/history/dose/audit/reminder/snooze/idempotency tables, inserts default v1-equivalent settings (22:00–04:00, 30 minutes, America/Los_Angeles, group mode), maps legacy day status into v2 day records, maps legacy sent slots into delivered reminder slots, and leaves the push subscription in `config` unchanged.

Before deployment, save an authenticated status snapshot and confirm the subscription is active. After deployment, immediately export JSON and verify schema version 2, the current taken state, historical rows, default settings, and active subscription. Do not delete old tables. Worker rollback restores code but not SQLite state; v2 therefore keeps old data and schema compatible. Use Cloudflare's documented point-in-time recovery only after confirming its current availability and retention for the account.
