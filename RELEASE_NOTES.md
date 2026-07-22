# PourMed v1.0.0

PourMed v1.0.0 is the first public release of the privacy-first, self-hosted medication reminder application.

## Highlights

- Installable PWA with iPhone Home Screen support
- Configurable medication reminders, completion tracking, and snoozing
- Web Push notifications using deployment-specific VAPID keys
- Secure bearer-token authentication
- Medication history, notes, corrections, exports, and adherence statistics
- Cloudflare Worker with a SQLite-backed Durable Object
- Service-worker offline support and controlled application updates

Every user deploys PourMed to their own Cloudflare account and owns their own data and secrets. No shared hosted instance is provided.
