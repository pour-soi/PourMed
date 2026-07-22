# Changelog

All notable changes to PourMed are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Automatic device time-zone synchronization and a searchable manual IANA time-zone override.
- DST-safe reminder-slot tests across multiple regions and medication-day boundaries.

### Changed

- Reminder deduplication now includes the intended local slot and IANA time zone and tolerates slightly late Cron execution.
- Medication days reset at 7:00 AM in the active time zone, preserving the prior medication day throughout the overnight reminder window.
- Reminder calculations use IANA time-zone rules across daylight-saving-time transitions rather than fixed UTC offsets.
- Existing installations migrate additively to automatic time-zone mode without rewriting history.

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
