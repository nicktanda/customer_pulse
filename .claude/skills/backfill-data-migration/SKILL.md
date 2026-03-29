---
name: backfill-data-migration
description: >-
  Plans data backfills and one-off migrations that update rows in place: batching,
  idempotency, throttling, and deploy ordering separate from schema migrations.
  Use when changing existing records after adding a column, fixing bad data, or
  reprocessing feedback.
---

# Backfill data migrations

**Schema** migrations live in **`db/migrate/`**; **data** backfills often need a **separate** script or a **reversible** job pattern so deploys do not time out or lock tables.

## When to use

- Populating a **new column** from old data.
- Fixing **incorrect enums** or corrupted rows in bulk.
- **Reprocessing** feedback with AI after prompt changes (coordinate with **`ai-feedback-pipeline`**).

## Steps

1. **Estimate volume** — rows affected; whether a single transaction is safe.
2. **Idempotency** — Running the backfill twice should be safe (check `WHERE` or marker column).
3. **Batching** — Use `in_batches` or `find_each` with `batch_size`; avoid long locks on hot tables.
4. **Throttle** — Sleep between batches if external APIs or rate limits apply.
5. **Deploy order** — Often: deploy code that **reads** new column → backfill → deploy code that **requires** new column (or use defaults).
6. **Rollback story** — Know how to restore or re-run if the job fails mid-way.

## Notes

- Prefer **`rails runner`** scripts or rake tasks in **`lib/tasks/`** with clear names; document in `README` or internal runbook if operators run them.
- Heavy work belongs in **Sidekiq** or a maintenance window, not a request (**`sidekiq-jobs-and-schedules`**).
