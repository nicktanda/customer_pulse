---
name: webhooks-integration-safety
description: >-
  Implement or review inbound webhooks (Linear, Slack, Jira) and related security:
  signature verification, raw body handling, idempotency, and HTTP semantics.
  Use when changing apps/web API route handlers under api/webhooks or secrets
  for signing.
---

# Webhooks and integration safety

Public webhook endpoints are **Next.js App Router** route handlers under **`apps/web/src/app/api/webhooks/`** (e.g. Linear, Slack, Jira). They are **not** behind session login; security relies on **shared secrets**, **signature verification**, and careful parsing.

## When to use

- Editing **`apps/web/src/app/api/webhooks/*`** or adding a new provider route.
- Debugging 401/403/422 from providers or duplicate events.
- Rotating or configuring secrets documented in README / **`.env.example`** (never paste real values).

## Steps

1. Read the provider’s route handler and any Vitest or manual test notes for expected headers and payloads.
2. Preserve **constant-time** comparisons where applicable; reject bad signatures early with minimal leakage in responses.
3. Prefer **idempotent** handling: duplicate delivery should not double-apply business state (use unique ids when the provider supplies them).
4. Log enough to debug (event id, integration id) without logging raw secrets or full PII.
5. Add or extend tests for new branches and failure cases when the web test suite covers webhooks.

## Notes

- Env var **names** for secrets appear in **`README.md`** and **`.env.example`** — do not echo values from a real `.env`.
- If payload storage is needed, follow Drizzle models and encryption patterns (see **`encrypted-integrations`**).
