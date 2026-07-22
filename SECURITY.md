# Security

Report vulnerabilities privately to the project owner. Never include tokens, subscriptions, medication data, or Cloudflare credentials in an issue.

Private operations require a high-entropy bearer token; only its SHA-256 verifier is stored as a Worker secret. Responses are `no-store`, API calls are same-origin, the CSP blocks inline and third-party code, inputs are validated and bounded, mutations use rate limits and idempotency where duplicate taps matter, and exports redact credentials/subscriptions. The token is kept in `localStorage`; any successful same-origin script injection could read it, which is why the application has no third-party runtime code.

Never commit `.dev.vars`, `secrets/`, access tokens, hashes, VAPID private keys, push subscriptions, or Cloudflare credentials. Rotate the access token and VAPID keys after suspected exposure; VAPID rotation requires refreshing the device subscription. Lost access tokens cannot be recovered. This personal project has no guaranteed security-response SLA.
