---
name: security-pii-review
description: >-
  Reviews changes for security and privacy risks: PII in logs, webhook payloads,
  API responses, Lockbox usage, and secret handling. Use before merging features
  that touch feedback content, webhooks, integrations, BullMQ mail jobs, or logging.
---

# Security and PII review

Customer Pulse handles **customer feedback**, **integrations**, and **email** — high risk for **PII** (emails, names, message bodies) and **secrets** (API keys, webhook signing secrets).

## When to use

- Changing **`apps/web/src/app/api/webhooks/`**, **`apps/worker/src/job-handlers.ts`** (sync / mail / AI jobs), or reporting modules under **`apps/worker/src/`** (`reporting-nl`, `reporting-structured`, etc.).
- Adding or changing **logging**, **exceptions**, or **BullMQ** job payloads.
- Touching **Lockbox** / **integration** credential columns or **feedback** storage.

## Steps

1. **Logging** — grep for `console.log`, structured loggers, **`Sentry`** captures. Avoid logging full payloads, tokens, or decrypted credentials. Prefer IDs and source types.
2. **Responses** — Ensure JSON/API and error pages do not leak stack traces or internal keys in production.
3. **Webhooks** — Verify signature checks stay in place; no “skip verify” shortcuts (see **`webhooks-integration-safety`**).
4. **Encryption** — Integration secrets belong in Lockbox-compatible fields; **`LOCKBOX_MASTER_KEY`** rotation is a coordinated release (see **`encrypted-integrations`**).
5. **Anthropic** — Do not send unnecessary PII in prompts; follow team policy on retention and summarization.

## Notes

- Align with CI expectations from **`test-and-ci-gate`** (lint, tests, build).
- This skill complements **`product-ui-pr-review`** (UX) with a **security/privacy** lens.
