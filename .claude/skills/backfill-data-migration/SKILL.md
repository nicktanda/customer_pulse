---
name: backfill-data-migration
description: >-
  Plans data backfills and one-off migrations that update rows in place: batching,
  idempotency, throttling, and deploy ordering separate from schema migrations.
  Use when changing existing records after adding a column, fixing bad data, or
  reprocessing feedback.
---

# Backfill data migrations

**Schema** changes use **Drizzle** in **`packages/db`**; **data** backfills often need a **separate** script or **worker job** so deploys do not time out or lock tables.

## When to use

- Populating a **new column** from old data.
- Fixing **incorrect enums** or corrupted rows in bulk.
- **Reprocessing** feedback with AI after prompt changes (coordinate with **`ai-feedback-pipeline`**).

## Steps

1. **Estimate volume** — rows affected; whether a single transaction is safe.
2. **Idempotency** — Running the backfill twice should be safe (narrow `WHERE` or use a marker column).
3. **Batching** — Process rows in chunks with `LIMIT`/`OFFSET` or key-range iteration; avoid loading entire tables into memory.
4. **Throttle** — Pause between batches if external APIs or rate limits apply.
5. **Deploy order** — Often: deploy code that **reads** new column → backfill → deploy code that **requires** new column (or use defaults).
6. **Rollback story** — Know how to restore or re-run if the job fails mid-way.

## Notes

- Prefer **one-off Node scripts** under **`scripts/*.mjs`** (with **`node --env-file=.env`**) or a **dedicated worker job**; document in README or a runbook if operators run them.
- Heavy work belongs in **BullMQ** or a maintenance window, not an HTTP request (**`bullmq-jobs-and-schedules`**).
