# PourMed v1.2.0

PourMed v1.2.0 adds a complete Simplified Chinese interface while preserving the existing English experience in the same installable PWA.

## Highlights

- Switch instantly between English and 简体中文 under Settings → Language.
- Use concise, native-reviewed Simplified Chinese copy throughout the interface.
- Keep the selected language after reopening the PWA and across Service Worker updates.
- Use localized dates, times, numbers, statistics, status text, accessibility labels, and notifications.
- Select Simplified Chinese on first use for `zh`, `zh-CN`, and `zh-SG` device languages; use English for unsupported locales, including Traditional Chinese locales.
- Keep English available in the same PWA, with one shared application and Service Worker.
- Use the new Chinese README and deterministic Chinese screenshot set for self-hosted setup and documentation.
- Preserve medication history, reminder schedules, time-zone settings, statistics, authentication, and existing Web Push subscriptions.

The release uses Service Worker v10 and requires no database migration. Existing history, settings, time zones, and push subscriptions remain unchanged.
