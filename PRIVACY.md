# Privacy

PourMed is self-hosted. Each user deploys a separate instance to an account they control; no shared PourMed service receives medication data.

PourMed stores schedule and appearance settings, medication names and optional details, medication-day completion and correction timestamps, plain-text notes, reminder/snooze/delivery metadata, one active push subscription, and minimal security/rate-limit values in one Cloudflare Durable Object. The device stores the private access token and public application shell. The service worker does not cache private `/api/` responses.

There are no advertisements, analytics, third-party scripts, or location tracking. Cloudflare and the device push platform necessarily process requests and delivery metadata under their policies. JSON/CSV exports intentionally exclude credentials and push-subscription data. Remove the device in-app before deleting the Worker if you want the subscription removed first. Deleting Durable Object data is destructive.
