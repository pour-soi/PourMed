# PourMed v1.2.1

PourMed v1.2.1 fixes stale completion times after a medication day is undone and completed again.

## Highlights

- Record a fresh completion time when changing a medication day from not taken to taken.
- Preserve the existing completion time when a completion action is repeated.
- Keep existing time-zone behavior unchanged.
- Preserve existing medication history, settings, and Web Push subscriptions.
- Require no database migration.

This is a completion-state timestamp fix, not a time-zone behavior change. The Service Worker remains v10 because no frontend asset or offline lifecycle behavior changed.
