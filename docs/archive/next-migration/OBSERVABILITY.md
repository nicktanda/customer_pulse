# Observability for the Next.js + worker stack

## Errors and tracing

- **Sentry**  
  Add `@sentry/nextjs` to `apps/web` and `SENTRY_DSN` in env (same pattern as Rails `config/initializers/sentry.rb`). For `apps/worker`, use `@sentry/node` in `src/index.ts` and wrap the process `main()` in `Sentry.captureException`.

- **Structured logs**  
  Prefix logs with `[web]` / `[worker]` and include `job.name`, `job.id`, and a request id when you add middleware to propagate `x-request-id`.

- **Queues**  
  Bull Board (see `apps/worker`) surfaces failed jobs and retries. Protect it with `BULL_BOARD_USER` / `BULL_BOARD_PASS` and firewall rules.

## Health checks

- **Web:** `GET /api/health` (or your load balancer path).
- **Worker:** optional HTTP `/health` on the worker process or rely on process manager restarts + Redis connectivity.

## Load testing

Before cutover, replay webhook traffic (Linear/Slack/Jira) against staging and watch Redis memory, Postgres connections, and Anthropic rate limits when AI jobs are enabled.
