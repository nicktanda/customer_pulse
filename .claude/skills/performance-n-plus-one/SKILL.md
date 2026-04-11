---
name: performance-n-plus-one
description: >-
  Reduces N+1 SQL and heavy loops in the Next.js app and worker: Drizzle query
  batching, pagination, and job chunk sizes. Use when pages or jobs slow down or
  feedback lists grow large.
---

# Performance N+1 and batching

Slow feedback dashboards and **BullMQ** jobs often trace back to **N+1 SQL** (many small queries in a loop) or **unbounded** full-table scans / API calls.

## When to use

- Optimizing feedback lists, project dashboards, or integration-heavy pages in **`apps/web`**.
- Changing **`apps/worker`** jobs that loop over many records or call external APIs.
- Investigating slow Vitest cases or production latency.

## Steps

1. **Identify** — Use logs, database `EXPLAIN`, or temporary timing around **server components** / **server actions** in **`apps/web`**; look for repeated identical queries per request or per job tick in **`apps/worker`**.
2. **Drizzle / SQL** — Prefer **single queries with joins** or **explicit `inArray` batches** instead of per-row queries inside loops; always paginate large lists (`limit` / cursor patterns).
3. **Jobs** — Batch external APIs; respect rate limits; add short delays between batches when providers are sensitive (see **`ai-feedback-pipeline`** patterns).
4. **Verify** — Re-run hot paths locally; run **`yarn test`** for affected packages.

## Notes

- Do not optimize without measuring; **correctness first** (especially AI and webhook paths).
- Pairs well with **`database-migrations-rollout`** if indexes are needed.
