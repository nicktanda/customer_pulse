---
name: webhooks-integration-safety
description: >-
  Implement or review inbound webhooks (Linear, Slack, Jira) and related security:
  signature verification, raw body handling, idempotency, and HTTP semantics.
  Use when changing app/controllers/webhooks, routes under webhooks/, or secrets
  for signing.
---

# Webhooks and integration safety

Public webhook endpoints live under **`namespace :webhooks`** in **`config/routes.rb`** (`linear`, `slack`, `jira`). They are **not** behind Devise; security relies on **shared secrets**, **signature verification**, and careful parsing.

## When to use

- Editing **`app/controllers/webhooks/*.rb`** or adding a new provider.
- Debugging 401/403/422 from providers or duplicate events.
- Rotating or configuring secrets documented in README / **`.env.example`** (never paste real values).

## Steps

1. Read the provider’s current controller and tests under **`spec/requests/webhooks/`** (e.g. `linear_spec`, `slack_spec`) for expected headers and payloads.
2. Preserve **constant-time** comparisons where applicable; reject bad signatures early with minimal leakage in responses.
3. Prefer **idempotent** handling: same delivery twice should not double-charge business state (use unique ids when the provider supplies them).
4. Log enough to debug (event id, integration id) without logging raw secrets or full PII.
5. Add or extend **request specs** for new branches and failure cases.

## Notes

- Env var **names** for secrets appear in **`README.md`** and **`.env.example`** — do not echo values from a real `.env`.
- If payload storage is needed, follow existing models and encryption patterns (see **encrypted-integrations** skill).
