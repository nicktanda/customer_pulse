---
name: encrypted-integrations
description: >-
  Work with third-party integrations and encrypted credentials (Lockbox-compatible),
  including Drizzle schema and UI flows. Use when editing integration rows, upsert
  helpers, or secrets storage for Linear, Slack, Google, etc.
---

# Encrypted integrations (Lockbox)

Integration credentials must stay encrypted at rest. The app uses **Lockbox-compatible** crypto and **`LOCKBOX_MASTER_KEY`** (see README / **`.env.example`**). Schema lives in **`packages/db`**; UI under **`apps/web/src/app/app/integrations/`** with mutations in **`apps/web/src/app/app/integrations/actions.ts`** (sync enqueue uses **BullMQ** **`cp-default`**). Shared upsert helpers: **`apps/web/src/lib/integrations-upsert.ts`**.

## When to use

- Adding a new integration type or credential field.
- Fixing decrypt/encrypt errors after key rotation or bad env config.
- Changing **sync enqueue** or connection-test behavior for integrations.

## Steps

1. Read **`packages/db/src/schema.ts`** (integrations table) and **`packages/db/src/lockbox.ts`** helpers.
2. Never log decrypted secrets; avoid printing credentials in exception messages.
3. When adding columns, use **Drizzle migrations** and plan backfills if needed (**`database-migrations-rollout`**).
4. Exercise flows from the UI or Vitest where they exist.
5. Document new env vars in **`README.md`** / **`.env.example`** as **names only**.

## Notes

- Rotating **`LOCKBOX_MASTER_KEY`** without a migration plan will make existing ciphertext unreadable — treat key changes as a release-critical operation.
