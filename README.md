# PourMed

A privacy-first medication reminder PWA built on Cloudflare Workers.

PourMed is a self-hosted, single-user application. Every user deploys an independent copy to their own Cloudflare account and `workers.dev` subdomain.

## Features

- Medication reminders with configurable schedules and snoozing
- Web Push notifications, including iPhone Home Screen support
- Installable Home Screen PWA
- Offline application shell
- Medication history and notes
- Period-based adherence statistics and streaks
- Daily adherence and individual medication completion
- Secure bearer-token access
- Cloudflare deployment with no third-party application services

## Architecture

- **Cloudflare Worker** — serves the application and authenticated JSON API
- **Durable Objects** — serializes state changes and reminder processing
- **SQLite** — stores settings, medications, history, and reminder state inside the Durable Object
- **Service Worker** — provides installation, offline shell caching, updates, and push handling
- **Web Push** — sends reminders using deployment-specific VAPID keys

The service worker never caches private `/api/` responses. PourMed includes no analytics, advertisements, third-party scripts, or location tracking.

## Installation

Requirements: Node.js 22+, pnpm, Git, and a new or existing Cloudflare account.

1. Clone the repository and install dependencies.

   ```sh
   git clone https://github.com/your-account/PourMed.git
   cd PourMed
   pnpm install
   ```

2. Sign in to your own Cloudflare account.

   ```sh
   pnpm wrangler login
   pnpm wrangler whoami
   ```

3. Generate a unique access token and VAPID key pair.

   ```sh
   pnpm secrets:generate
   ```

4. Add the generated values as secrets in your own Worker, add a VAPID contact subject, and deploy.

   ```sh
   pnpm wrangler secret bulk secrets/wrangler-secrets.env
   pnpm wrangler secret put VAPID_SUBJECT
   pnpm deploy
   ```

   Enter a value such as `mailto:you@example.com` for `VAPID_SUBJECT`. The deployment creates a URL on your own subdomain, for example `https://your-project.workers.dev`.

5. Open `secrets/access-token.txt` locally and copy the token into your installed PourMed app. Do not paste it into issues, logs, chat, or source files.

For a complete first-time walkthrough, notification setup, and verification steps, see [Deployment guide](docs/DEPLOYMENT.md).

## Local development

Create disposable local values only:

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev
```

Run the complete local validation gate with:

```sh
pnpm verify
```

See [Testing](docs/TESTING.md) for the integration verifier and test scope.

## Privacy

Medication history, settings, and push-subscription state stay inside each user's own Cloudflare deployment. The device keeps the access token locally, while the Worker stores only its SHA-256 verifier as a secret. JSON and CSV exports exclude credentials and push-subscription data.

Each user owns and controls their own data, Cloudflare account, deployment, and secrets. Deleting a deployment and its Durable Object data is the responsibility of that deployment's owner.

> **Never commit tokens or secrets.** Keep `.dev.vars`, `secrets/`, access tokens, VAPID private keys, Cloudflare credentials, and database files out of version control.

See [Privacy](PRIVACY.md) and [Security](SECURITY.md).

## Safety

PourMed is a personal reminder, not medical advice or a certified medical device. Push delivery is best effort and may be affected by connectivity, operating-system settings, Focus modes, or subscription expiry. Never take an extra dose solely because the app's status is uncertain; confirm uncertain dosing with a clinician or pharmacist.

## License

PourMed is available under the [MIT License](LICENSE).
