# Screenshot safety record

The README screenshots were captured from the real PourMed application running as an isolated local Cloudflare Worker with a separate temporary SQLite Durable Object store.

The demo uses only synthetic data:

- generic `Evening tablet` and `Daily supplement` medication names;
- 20 generated medication days with taken, missed, and partial states;
- a disposable access token and VAPID key pair generated solely for the local session;
- a reserved `.invalid` push endpoint representing an active subscription;
- no Cloudflare account, remote Worker, or production deployment.

The access token was never rendered in a screenshot. The diagnostics capture shows token length only and has an empty access field. Images contain no production URL, Account ID, credentials, personal medication record, private push endpoint, browser chrome, or debug console.

Files:

- `home.png` — active medication day before completion;
- `completed.png` — successful completion state;
- `history.png` — calendar and day summary with synthetic history;
- `statistics.png` — adherence, streaks, summary cards, and timeline;
- `notifications-diagnostics.png` — authentication, subscription, and service-worker diagnostics with an empty token field.

All PNGs use an iPhone-width viewport and an optimized 64-color palette.
