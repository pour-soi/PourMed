# Testing

`pnpm verify` is the complete local gate: format check, ESLint, both TypeScript targets, Vitest coverage, Vite plus Wrangler dry-run builds, required asset checks, secret scan, and production dependency audit. Shared tests cover medication-day boundaries, DST, cross-midnight schedules, all allowed intervals, completion modes, optional medication behavior, adherence/streaks, CSV safety, service-worker privacy/update behavior, manifest requirements, and client auth/runtime diagnostics.

The local Worker integration verifier exercises a real SQLite migration and authenticated API flow:

```sh
POURMED_TEST_TOKEN=local-test-token pnpm verify:v2-api -- http://127.0.0.1:8792
```

It creates disposable medications, changes/restores settings, tests individual/group completion, correction, snooze/cancel, notes, history, statistics, and redacted exports, then cleans up. Use disposable local data only. Production verification should prefer read-only checks and exact restoration; never alter a real medication record merely to prove an endpoint.
