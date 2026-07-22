# Security Policy

## Supported versions

| Version          | Supported |
| ---------------- | --------- |
| 1.0.x            | Yes       |
| Earlier versions | No        |

Security fixes are made against the current source on `main`. Self-hosting operators are responsible for reviewing changes and updating their own deployment.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting from the repository's **Security → Advisories → Report a vulnerability** page. Do not open a public issue for a secret exposure or exploitable vulnerability. If the private form is unavailable, open a minimal issue asking the maintainers to establish a private channel, without including technical details.

Include only the information needed to reproduce and assess the problem:

- affected version or commit;
- affected component and deployment context;
- reproduction steps using synthetic data;
- expected and observed behavior;
- likely impact and any suggested mitigation.

Never send access tokens, token verifiers, VAPID private keys, Cloudflare credentials, push-subscription endpoints, medication records, personal data, or production database exports. Redact account identifiers and deployment URLs unless they are essential, and agree on a private method before sharing them.

## Response expectations

This community project provides no emergency response, guaranteed response time, or security-response service-level agreement. Do not use PourMed or its vulnerability-reporting channel for a medical emergency.

PourMed is a reminder and tracking tool, not an emergency medical service, medical advice, or a medical device.
