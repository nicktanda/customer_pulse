# Production cutover checklist

Use this when the TypeScript stack has parity with Rails for your critical paths.

## Pre-cutover

1. Run the full test suite: `yarn test`, `yarn workspace web lint`, and `yarn build:web`; smoke-test the worker (`yarn dev:worker` against staging Redis).
2. Confirm **Lockbox**: decrypt at least one real `integrations.credentials_ciphertext` row with Node ([`packages/db/src/lockbox.ts`](../../../packages/db/src/lockbox.ts)) using production-style `LOCKBOX_MASTER_KEY`.
3. Staging shadow: point a subset of webhooks to the Next webhook URLs and compare `feedbacks` rows (source, `source_external_id`, `project_id`).

## Single-writer window

1. Put Rails into **read-only** or **maintenance** mode for operators (optional but safest).
2. **Stop any legacy Sidekiq/Rails workers** so no duplicate cron or job processing.
3. Start **worker** (`apps/worker`) with the same `REDIS_URL` / `DATABASE_URL` as configured for Next.
4. Switch traffic: DNS / reverse proxy to the Next.js app (port 3000 or your platform default).

## Post-cutover

1. Verify `POST /api/v1/feedback`, webhooks, and daily pulse (mailers queue).
2. Monitor Sentry and Bull Board for 24–72 hours.
3. Decommission any remaining legacy hosts when stable; keep a rollback branch and DB backup.

## Rollback

Restore DNS to the previous stack and stop the Node worker to avoid double cron (or pause repeatable jobs in Redis).
