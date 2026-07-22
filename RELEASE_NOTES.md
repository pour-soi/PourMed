# PourMed v1.0.0

PourMed v1.0.0 is the first public release of the privacy-first, self-hosted medication reminder application.

## Highlights

- Installable PWA with iPhone Home Screen support
- Configurable medication-day reminders, completion tracking, and snoozing
- Web Push with immediate and delayed notification testing
- Secure, server-enforced bearer-token authentication
- Medication history, notes, corrections, exports, adherence statistics, and streaks
- Cloudflare Worker with a SQLite-backed Durable Object
- Service-worker offline support and controlled application updates

Every user deploys PourMed to their own Cloudflare account and owns their own data and secrets. No shared hosted instance is provided. On iPhone, Web Push requires iOS 16.4 or later, installation on the Home Screen, and permission granted from the installed PWA.

See the [deployment guide](https://github.com/pour-soi/PourMed/blob/v1.0.0/docs/DEPLOYMENT.md) to create an independent instance.

PourMed is a reminder and tracking tool, not medical advice, a medical device, or an emergency system. Do not rely on it as the sole safeguard for critical medication.
