---
name: incident-triage-production
description: >-
  Structured triage when production errors, job failures, or integration outages
  occur. Use when debugging live issues, Sentry alerts, or BullMQ failed jobs — not
  for normal local development.
---

# Incident triage (production)

Use this for **alerts** and **outages**, not everyday coding. Goal: **narrow blast radius**, **restore service**, then **fix root cause**.

## When to use

- Error spikes in **Sentry** (if **`SENTRY_DSN`** is configured — see **`docs/agents.md`**).
- **BullMQ** retries exhausted, stalled jobs, or repeatable schedules not firing.
- Webhooks or integrations suddenly failing (Linear, Slack, Jira, etc.).

## Steps

1. **Identify scope** — One integration vs whole app? Web vs worker? Check deploy timing vs alert time.
2. **Dashboards** — **Bull Board** on the worker HTTP port (default **3002** in dev; configure in production with auth): inspect **`cp-default`** and **`cp-mailers`** queues, failed jobs, repeatables. Confirm Redis (**`REDIS_URL`** — name in README / **`.env.example`** only).
3. **Logs** — Application and worker logs on your host; correlate request id / job id if available.
4. **Secrets / config** — Confirm env vars present in production (names in README); no key rotation without a plan (**Lockbox** — see **`encrypted-integrations`**).
5. **Mitigate** — Scale workers, pause a noisy repeatable job, or rollback deploy if needed; document the decision.
6. **Follow-up** — Open a ticket for a permanent fix; add tests or monitoring to prevent recurrence.

## Notes

- **Do not** paste production secrets into chat or commits.
- Local reproduction: **`docker-and-local-dev`** or **`yarn dev`** / **`bin/dev`** with sanitized data.
