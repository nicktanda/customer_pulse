---
name: sidekiq-jobs-and-schedules
description: >-
  Change or add Sidekiq jobs, queues, and scheduled work (sidekiq-cron) in this
  repo. Use when editing app/jobs, job retries, cron definitions, or Redis-related
  async behavior.
---

# Sidekiq jobs and schedules

Background work uses **Sidekiq** with Redis; **`config/sidekiq.yml`** sets concurrency and queues (`default`, `mailers`). Cron-style schedules are managed via **sidekiq-cron** (Sidekiq Web mounts cron UI at **`/sidekiq`** for admins).

## When to use

- Adding or changing classes under **`app/jobs/`** (e.g. `ProcessFeedbackBatchJob`, `SendDailyPulseJob`, sync jobs).
- Adjusting when jobs run, idempotency, or failure handling.
- Investigating duplicate runs, stuck queues, or mailer delays.

## Steps

1. Subclass **`ApplicationJob`** unless there is an existing pattern; follow naming like existing jobs in **`app/jobs/`**.
2. Keep jobs **idempotent** when possible (safe to retry): external APIs and webhooks can duplicate-deliver.
3. For schedules, locate cron definitions (config initializers / YAML as used in this project) and document the user-visible effect (e.g. daily digest time).
4. After changes, run **`bundle exec rspec`** if job specs exist; otherwise smoke-test in dev with **`bin/dev`** (worker process in **`Procfile.dev`**).
5. For production thinking: note Redis connectivity (**`REDIS_URL`** per README / **`.env.example`** names only).

## Notes

- Do not log secrets; job arguments may contain PII — treat logs carefully.
- Heavy work should stay off the request cycle; prefer jobs already used for AI batching and syncs.
