# Rails → Next.js migration parity matrix

This document maps the **legacy Rails application** to the TypeScript stack (`apps/web`, `apps/worker`, `packages/db`). Update it as endpoints and jobs are ported.

**Other migration notes** (cutover, Auth.js, Lockbox verification, observability, historical Sidekiq cron YAML) live under [`docs/archive/next-migration/`](../archive/next-migration/).

**Latest parity work (TypeScript stack):** The authenticated shell uses an httpOnly **current project** cookie (`/app/set-project`) and onboarding gating in `apps/web/src/app/app/layout.tsx`. Dashboard, projects (CRUD, members, switch), feedback (filters, pagination, detail, bulk, reprocess), onboarding steps, integrations (CRUD, sync enqueue), settings (GitHub via Lockbox), recipients, pulse reports (list/show, queue daily pulse / resend / PR stub), and skills (CRUD + `.claude/skills/<name>/SKILL.md`) are implemented under `apps/web/src/app/app/`. The worker runs real `process_feedback` (optional Anthropic HTTP), creates `pulse_reports` rows for `SendDailyPulseJob`, marks `GenerateGithubPrJob` attempts as failed until the GitHub port is complete, and bumps `integrations.last_synced_at` for scheduled sync jobs. Remaining: full transactional mailer content/SMTP parity, Rails-style cached “general settings”, per-integration `test_connection` endpoints, and full sync/AI batch job logic.

## HTTP routes (legacy Rails `config/routes.rb` — not in this repo; listed here for parity only)

| Rails route | Method | Auth | Next.js / worker target |
|-------------|--------|------|-------------------------|
| Devise sessions / registrations | GET, POST | Public | `apps/web` Auth.js (`/login`, callbacks) |
| `users/omniauth_callbacks` (Google) | GET | OAuth | Auth.js Google provider + email link |
| `up` | GET | Public | `GET /api/health` |
| `root` (dashboard) | GET | User | `apps/web` `/app` |
| `projects` | CRUD + `switch` | User | `/app/projects`, API under `/api/app/projects` |
| `project_users` (members) | index, create, destroy | User | `/app/projects/[id]/members` |
| `onboarding` | show, update_step, test_connection, complete | User | `/app/onboarding` |
| `feedback` | index, show, update, override, reprocess, bulk_update | User | `/app/feedback`, `/app/feedback/[id]` |
| `integrations` | CRUD-ish, sync_all, test_connection, sync_now | User | `/app/integrations` |
| `email_recipients` | CRUD | User | `/app/recipients` |
| `settings` | show, update, save_github, test_github | User | `/app/settings` |
| `pulse_reports` | index, show, generate, generate_pr, resend | User | `/app/pulse-reports` |
| `skills` | CRUD | User | `/app/skills` |
| `api/v1/feedback` | POST | `X-API-Key` (custom integration) | `POST /api/v1/feedback` |
| `webhooks/linear` | POST | HMAC (integration `webhook_secret`) | `POST /api/webhooks/linear` |
| `webhooks/slack` | POST | Slack signing (`SLACK_SIGNING_SECRET`) | `POST /api/webhooks/slack` |
| `webhooks/jira` | POST | HMAC (`integration.webhook_secret`) | `POST /api/webhooks/jira` |
| Sidekiq Web `/sidekiq` | * | Admin | Bull Board on worker HTTP (see `apps/worker`) |

## Background jobs (legacy Rails `app/jobs/` — not in this repo) ↔ BullMQ

| Job | Schedule ([historical `sidekiq_schedule.yml`](../archive/next-migration/sidekiq_schedule.yml)) | Notes |
|-----|-------------------------------------------------------------------------|--------|
| `ProcessFeedbackBatchJob` | `0 */4 * * *` | AI batch |
| `SyncGoogleFormsJob` | `*/15 * * * *` | |
| `SendDailyPulseJob` | `0 9 * * *` | Worker queue `mailers` |
| `GenerateInsightsJob` | `0 6 * * *` | |
| `WeeklyThemeAnalysisJob` | `0 4 * * 0` | |
| `BuildAttackGroupsJob` | `0 7 * * 1` | |
| `SyncJiraJob` | `*/15 * * * *` | |
| `SyncExcelOnlineJob` | `*/15 * * * *` | |
| `SyncGongJob` | `*/30 * * * *` | |
| `SyncSlackJob` | `* * * * *` | High frequency |
| `SyncSentryJob` | `*/15 * * * *` | |
| `SyncZendeskJob` | `*/15 * * * *` | |
| `SyncIntercomJob` | `*/15 * * * *` | |
| `SyncLogrocketJob` | `*/15 * * * *` | |
| `SyncFullstoryJob` | `*/15 * * * *` | |
| `SyncLinearJob` | `*/15 * * * *` | |
| `ProcessFeedbackJob` | On-demand | From UI / enqueue |
| `GenerateGithubPrJob`, `GithubAutoMergeJob` | On-demand | GitHub PR flow |
| `SyncGoogleFormsJob` | (see above) | |

Worker registry: [`apps/worker/src/queues.ts`](../../apps/worker/src/queues.ts) (repeatable job names mirror the YAML keys).

## Services (legacy Rails `app/services/` — not in this repo)

| Ruby module / file | Port target |
|--------------------|-------------|
| `integrations/*_client.rb` | `packages/db` or `apps/worker/src/integrations/` (HTTP clients) |
| `ai/*` | `apps/worker` + Anthropic Node SDK |
| `pulse_generator.rb` | `apps/worker` + React Email / mail sender |
| `github/*` | `apps/worker` |
| `insights/orchestrator.rb` | `apps/worker` |

## Legacy ActiveRecord enums → integer values (must match DB; Drizzle mirrors these in `packages/db`)

### `feedbacks`

- **source**: linear=0, google_forms=1, slack=2, custom=3, gong=4, excel_online=5, jira=6, logrocket=7, fullstory=8, intercom=9, zendesk=10, sentry=11
- **category**: uncategorized=0, bug=1, feature_request=2, complaint=3
- **priority**: unset=0, p1=1, p2=2, p3=3, p4=4
- **status**: new_feedback=0, triaged=1, in_progress=2, resolved=3, archived=4

### `integrations.source_type`

linear=0, google_forms=1, slack=2, custom=3, gong=4, excel_online=5, jira=6, logrocket=7, fullstory=8, intercom=9, zendesk=10, sentry=11, github=12

### `users.role`

viewer=0, admin=1

### `insights`

- **insight_type**: problem=0, opportunity=1, trend=2, risk=3, user_need=4
- **severity**: informational=0, minor=1, moderate=2, major=3, critical=4
- **status**: discovered=0, validated=1, in_progress=2, addressed=3, dismissed=4

### `ideas`

- **idea_type**: quick_win=0, feature=1, improvement=2, process_change=3, investigation=4
- **effort_estimate**: trivial=0, small=1, medium=2, large=3, extra_large=4
- **impact_estimate**: minimal=0, low=1, moderate=2, high=3, transformational=4
- **status**: proposed=0, under_review=1, approved=2, in_development=3, completed=4, rejected=5

### `idea_pull_requests.status`

pending=0, open=1, merged=2, closed=3, failed=4

### `idea_relationships.relationship_type`

complementary=0, alternative=1, prerequisite=2, conflicts=3, extends=4

### `stakeholder_segments.segment_type`

user_segment=0, internal_team=1, customer_tier=2, use_case_group=3, geographic_region=4

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Next, worker, Drizzle | PostgreSQL |
| `REDIS_URL` | Worker, Next (enqueue) | BullMQ |
| `LOCKBOX_MASTER_KEY` | Next/worker when reading integrations | Lockbox-compatible decryption ([lockbox.ts](../../packages/db/src/lockbox.ts)) |
| `ANTHROPIC_API_KEY` | Worker (future AI jobs) | Claude |
| `AUTH_SECRET` | Next Auth.js | Session signing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Auth.js | OAuth |
| `SLACK_SIGNING_SECRET` | Webhook route | Slack signature |
| `LINEAR_WEBHOOK_SECRET` | Optional | Linear (optional global secret; integrations may use per-integration secrets) |
| `SENTRY_DSN` | Next + worker | Error reporting ([archived OBSERVABILITY.md](../archive/next-migration/OBSERVABILITY.md)) |
| `BULL_BOARD_PORT`, `BULL_BOARD_USER`, `BULL_BOARD_PASS` | Worker | Admin queue UI |

See also [`.env.example`](../../.env.example).

## External APIs (integrations)

Linear, Slack, Jira, Google (Forms/Sheets OAuth), Gong, Excel Online, Zendesk, Intercom, LogRocket, FullStory, Sentry, GitHub, Anthropic — each Ruby client under `app/services/integrations/` or `app/services/ai/` has a corresponding port row in the worker integration backlog.
