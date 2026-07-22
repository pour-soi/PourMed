# Contributing to PourMed

Thank you for helping improve PourMed. Keep changes focused, privacy-safe, and verifiable.

## Local setup

Requirements are Node.js 22+, pnpm, and Git.

```sh
git clone https://github.com/pour-soi/PourMed.git
cd PourMed
corepack enable
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm dev
```

Use only disposable local credentials and synthetic medication data. Replace every `.dev.vars` placeholder locally; never commit that file.

## Branches and pull requests

Use a short, descriptive branch name such as `feature/history-filter`, `fix/push-status`, or `docs/deployment-guide`.

- Keep each pull request focused on one problem.
- Explain the user-visible behavior and why the change is needed.
- Avoid unrelated refactoring, formatting, or dependency changes.
- Add or update tests that protect the intended behavior.
- Update documentation when commands, configuration, or user behavior changes.
- Never include generated builds, local databases, logs, production identifiers, or deployment credentials.

## Required validation

Run the complete local gate before submitting:

```sh
pnpm verify
```

This checks formatting, lint, both TypeScript targets, tests and coverage, the production build, Wrangler dry run, assets, secret patterns, and production dependency advisories.

## Privacy and test data

Fixtures, screenshots, logs, and bug reports must use synthetic data. Do not include real access tokens, token hashes, VAPID private keys, Cloudflare credentials or Account IDs, push-subscription endpoints, medication names, medication history, database exports, personal deployment URLs, or other personal data.

## Accessibility and PWA verification

Preserve keyboard access, visible focus, semantic labels, readable contrast, reduced layout shift, and iPhone-width responsiveness. Charts or color must never be the only way information is communicated.

Changes to notifications, installation, caching, or service-worker updates require manual verification in an installed iPhone Home Screen PWA where practical. Document the iOS version, service-worker version, permission state, and subscription state, but never private values. Do not send tests to another person's device or deployment.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues according to [SECURITY.md](SECURITY.md).
