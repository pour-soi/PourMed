# Changelog

All notable changes to PourMed are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-07-22

### Added

- Complete English and Simplified Chinese interfaces in one PWA, with an accessible language control under Settings.
- First-use language detection for `zh`, `zh-CN`, and `zh-SG`, plus a persistent manual preference and English fallback.
- Locale-aware dates, times, numbers, accessibility labels, errors, and Web Push notification copy.
- A Simplified Chinese README and deterministic Chinese screenshot set.

### Changed

- The Service Worker advances to v10 so installed PWAs receive the localized frontend.
- Notification language is recorded in the existing Durable Object configuration store without changing the schema or push subscription.

Existing medication history, schedules, time-zone settings, adherence records, and push subscriptions are not rewritten.

## [1.1.0] - 2026-07-22

### Added

- Automatic device time-zone synchronization and a searchable manual IANA time-zone override.
- Client and server validation for canonical IANA time-zone identifiers.
- DST-safe reminder-slot tests across multiple regions and medication-day boundaries.

### Changed

- Reminder deduplication now includes the intended local slot and IANA time zone and tolerates slightly late Cron execution.
- Medication days reset at 7:00 AM in the active time zone, preserving the prior medication day throughout the overnight reminder window.
- Reminder calculations use IANA time-zone rules across daylight-saving-time transitions rather than fixed UTC offsets.
- Existing installations migrate additively to automatic time-zone mode without rewriting history.
- The SQLite Durable Object schema advances to v3 while preserving medication history and existing Web Push subscriptions.
- The Service Worker advances to v9, and the UTC one-minute Cron remains application-controlled for local reminder slots.

### Fixed

- The public health endpoint now reports the canonical application version from package metadata.

## [1.0.0] - 2026-07-22

### Added

- Installable Home Screen PWA with a controlled service-worker update flow.
- Timezone-aware medication-day reminder logic, completion tracking, and snoozing.
- Web Push notifications with immediate and delayed notification tests.
- Server-enforced access-token authentication.
- Medication history, notes, corrections, and exports.
- Period-based adherence statistics and streak tracking.
- Offline application shell that excludes private API responses.
- Self-hosted Cloudflare Worker and SQLite Durable Object deployment.

[1.0.0]: https://github.com/pour-soi/PourMed/releases/tag/v1.0.0
[1.1.0]: https://github.com/pour-soi/PourMed/releases/tag/v1.1.0
[1.2.0]: https://github.com/pour-soi/PourMed/releases/tag/v1.2.0
