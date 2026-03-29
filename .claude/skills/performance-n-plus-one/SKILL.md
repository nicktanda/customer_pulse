---
name: performance-n-plus-one
description: >-
  Reduces N+1 queries and heavy loops in Rails: eager loading, batching, and
  job chunk sizes. Use when pages or jobs slow down, Bullet flags queries, or
  feedback lists grow large.
---

# Performance N+1 and batching

Slow feedback dashboards and **Sidekiq** jobs often trace back to **N+1 SQL** or **unbounded** `find_each` / API calls.

## When to use

- Optimizing **`Feedback`**, **`Integration`**, or dashboard controllers.
- Changing **`app/jobs/`** that loop over many records or call external APIs.
- Investigating slow request specs or production latency.

## Steps

1. **Identify** — Use logs, `rack-mini-profiler` or **Bullet** if added in development; look for repeated identical queries.
2. **ActiveRecord** — Prefer **`includes`**, **`preload`**, or **`eager_load`** on associations shown in the same request; avoid loading large collections into memory without pagination (**`pagy`** is in the Gemfile).
3. **Jobs** — Batch external APIs; respect rate limits; keep **`sleep`** between calls (see **`ai-feedback-pipeline`** patterns).
4. **Verify** — `EXPLAIN` in development for hot queries; run **`bundle exec rspec`** for affected areas.

## Notes

- Do not optimize without measuring; **correctness first** (especially AI and webhook paths).
- Pairs well with **`database-migrations-rollout`** if indexes are needed.
