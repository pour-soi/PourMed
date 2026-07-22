# Screenshot safety and regeneration record

The README screenshots are generated from the real PourMed v1.1.0 client rendered by Vite in an isolated Playwright browser. The workflow intercepts only that local page's API calls with deterministic in-memory fixtures. It never starts Wrangler, connects to Cloudflare, opens a production URL, reads a browser profile, or creates a Durable Object.

## Deterministic fixture

- Medication: fictional `Evening Medication`
- Fixture instant: July 21, 2026 at 10:15 PM PDT (`2026-07-22T05:15:00Z`)
- IANA time zone: `America/Los_Angeles`
- Locale: `en-US`
- Schedule: 10:00 PM–4:00 AM every 30 minutes
- Medication-day boundary: 7:00 AM
- History: 30 medication days, 26 taken and 4 missed
- Calculated statistics: 87% adherence, 6-day current streak, 14-day longest streak
- Viewport: 390 × 844 CSS pixels at 3× device scale
- Primary theme: Light; one optional Home capture uses Dark

The local fixture uses a disposable synthetic token only inside the temporary browser context so the real authenticated UI path can render. Its visible input is cleared before capture. No token value, production hostname, Account ID, Worker or Durable Object identifier, VAPID material, push endpoint, subscription key, private response, or personal medication data appears in an image or committed file.

## Files

- `pourmed-hero.png` — 1800 × 900 composite of Home, Statistics, and Time Zone Settings
- `home-pending-light.png` — reminder-pending Home state
- `home-completed-light.png` — successful completion state
- `history-light.png` — July medication-day history, including an early-morning completion assigned to the prior day
- `statistics-light.png` — calculated 30-day adherence, streaks, counts, and timeline
- `settings-time-zone-light.png` — Automatic device time zone with Manual mode available
- `notifications-status-light.png` — safe healthy diagnostics with Service Worker v9
- `home-pending-dark.png` — optional Dark Mode Home state

## Regenerate

Install the development dependencies and Playwright's Chromium build, then run:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm screenshots
```

The browser binary is stored in Playwright's user cache and is not committed. The script writes only the final optimized PNGs under `docs/images/`; no profile, storage dump, report, temporary image, or credential file is retained.
