# Deployment checklist

Use the full [deployment guide](DEPLOYMENT.md) for a new account. This checklist is the short verification gate for every self-hosted instance.

- Confirm Wrangler is authenticated to the intended Cloudflare account with `pnpm wrangler whoami`.
- Confirm the repository contains no `.dev.vars`, `secrets/`, access-token, credential, database, or log files.
- Review current Cloudflare Workers and Durable Objects limits for the account.
- Run `pnpm verify` successfully.
- Generate deployment-specific credentials with `pnpm secrets:generate`.
- Upload the generated secret file and set `VAPID_SUBJECT`; never print either private value.
- Run `pnpm deploy` and record the deployment ID for that instance.
- Verify `/api/health`, rejected unauthenticated requests, and successful access with the locally stored token.
- Install from the instance's own URL, such as `https://your-project.workers.dev`.
- Enable notifications from the installed Home Screen app and confirm diagnostics complete.
- Preserve or export user data before upgrades. Code rollback does not reverse SQLite migrations.
