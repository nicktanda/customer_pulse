---
name: bullmq-jobs-and-schedules
description: >-
  Change or add BullMQ workers, queues, and repeatable schedules in apps/worker.
  Use when editing job handlers, Redis connection, Bull Board, or cron-style
  repeat patterns.
---

# BullMQ jobs and schedules

Background work uses **BullMQ** with **Redis**. The worker entrypoint is **`apps/worker/src/index.ts`**. Queue names are **`cp-default`** (AI, syncs, reporting) and **`cp-mailers`** (pulse send/resend) — defined in **`apps/worker/src/queue-names.ts`** and duplicated in **`apps/web/src/lib/queue-names.ts`** (keep both files aligned). Repeatable schedules live in **`apps/worker/src/schedules.ts`**; processors in **`apps/worker/src/job-handlers.ts`**. **Bull Board** (optional admin UI) listens on **`BULL_BOARD_PORT`** (default **3002** in dev).

## When to use

- Adding or changing processors for jobs (syncs, mailers, AI batches, etc.).
- Adjusting repeat cron patterns, idempotency, or failure handling.
- Investigating duplicate runs, stuck queues, or delayed mail.

## Steps

1. Find the queue name in **`apps/worker/src/queue-names.ts`** and the handler branch in **`job-handlers.ts`** (or add one following existing patterns).
2. Keep jobs **idempotent** when possible (safe to retry): external APIs and webhooks can duplicate-deliver.
3. For schedules, edit **`schedules.ts`** and document the user-visible effect (e.g. daily digest time).
4. After changes, run **`yarn test`** and smoke-test locally with **`yarn dev`** (web + worker) or **`yarn workspace worker dev`**.
5. For production: confirm **`REDIS_URL`** and **`DATABASE_URL`** on the worker service (see README / **`.env.example`** names only).

## Notes

- Do not log secrets; job payloads may contain PII — treat logs carefully.
- Heavy work stays off the Next.js request cycle; enqueue from **`apps/web`** (server actions or route handlers) with **`getRedis()`** / **`Queue`** from **BullMQ**, same **`REDIS_URL`** as the worker.
