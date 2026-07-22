# Deploy PourMed to Cloudflare

This guide starts with a brand-new Cloudflare account. You will create an independent PourMed instance; do not use another person's deployment.

## 1. Prepare the project

Install Node.js 22 or newer, pnpm, and Git. Then clone the repository and install its dependencies:

```sh
git clone https://github.com/your-account/PourMed.git
cd PourMed
pnpm install
```

Before continuing, review the current Cloudflare Workers and Durable Objects limits for your account. PourMed does not require a custom domain.

## 2. Sign in with Wrangler

```sh
pnpm wrangler login
pnpm wrangler whoami
```

Wrangler opens Cloudflare's authorization page. After authorizing it, check that `whoami` shows the account you intend to use.

## 3. Create your access token and VAPID keys

```sh
pnpm secrets:generate
```

The command creates two ignored, mode-600 files:

- `secrets/access-token.txt` — the private token you enter on your devices
- `secrets/wrangler-secrets.env` — the access-token verifier, expected token length, and Web Push key pair for Cloudflare

The command does not print private values. Store these files securely. If the access token is lost, it cannot be recovered from the Worker verifier.

## 4. Create the Worker secrets

Upload the generated secrets to your own Worker:

```sh
pnpm wrangler secret bulk secrets/wrangler-secrets.env
pnpm wrangler secret put VAPID_SUBJECT
```

When prompted for `VAPID_SUBJECT`, enter a contact URI you control, such as:

```text
mailto:you@example.com
```

The required secrets are:

- `ACCESS_TOKEN_HASH`
- `ACCESS_TOKEN_LENGTH`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Never paste their values into source files or commit the generated files.

## 5. Validate and deploy

```sh
pnpm verify
pnpm deploy
```

Wrangler creates the Worker, static assets, Cron Trigger, and SQLite Durable Object in your account. It reports your deployment URL and deployment ID. Your URL will use your own subdomain, for example:

```text
https://your-project.workers.dev
```

Check the public health endpoint:

```sh
curl https://your-project.workers.dev/api/health
```

Do not put the access token on a command line or in shell history. Use the app to verify authenticated access.

## 6. Install and authenticate

1. Open your own HTTPS deployment in iPhone Safari.
2. Choose **Share → Add to Home Screen**.
3. Launch PourMed from the Home Screen.
4. Open `secrets/access-token.txt` on your computer and copy the token to the app.
5. Tap **Save on This Device** and confirm the status loads.

The token is stored in same-origin browser storage on that device. Treat the device and token as private.

## 7. Enable notifications

1. In the installed Home Screen app, wait for notification capability diagnostics to complete.
2. Tap **Enable Notifications**.
3. Allow the iOS permission prompt.
4. Confirm the app shows an active push subscription.
5. Use the test notification only on your own instance and device.

Web Push is best effort. iOS settings, Focus modes, connectivity, and expired subscriptions can delay or suppress delivery.

## 8. Keep the deployment private and maintainable

- Run `pnpm verify` before each update.
- Keep `secrets/`, `.dev.vars`, access tokens, database files, and logs out of Git.
- Export data before destructive maintenance.
- Use [the cleanup guide](CLOUDFLARE_CLEANUP.md) only when you intend to permanently delete the instance and its data.
- See [the iPhone checklist](IPHONE_VERIFICATION.md) for device verification.
