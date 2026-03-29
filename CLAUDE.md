# Customer Pulse — Claude Code project context

This file is read by **Claude Code** so every session starts with accurate project facts. Update it when the stack or commands change.

## What this app is

**Customer Pulse** is a Rails app that ingests customer feedback from Linear, Google Forms, Slack, and a custom API, stores it in PostgreSQL, and uses the **Anthropic API** (in-app, not this file) to classify and triage items. It sends a daily email digest (“Customer Pulse”). Authentication uses **Devise**; background work uses **Sidekiq** + **Redis**.

## Stack (high level)

| Area | Choice |
|------|--------|
| Framework | Rails **8.0** (see `Gemfile`) |
| DB | **PostgreSQL** |
| Cache / jobs | **Redis** + **Sidekiq** (+ sidekiq-cron for schedules) |
| Front end | **Hotwire** (Turbo, Stimulus), **Tailwind** CSS, **Propshaft**, JS/CSS via **esbuild** (`package.json` scripts) |
| Auth | **Devise** |
| Tests | **RSpec** (see `spec/`) |

Ruby version: see **`.ruby-version`**. Node/Yarn: see README — assets use `yarn`.

## Running locally

From the repo root:

```bash
bundle install
yarn install
cp .env.example .env   # then edit — never commit real secrets
bin/rails db:create db:migrate db:seed
bin/dev                # Foreman: web, JS watch, CSS watch, Sidekiq (loads `.env`)
```

- **`bin/dev`** runs **`Procfile.dev`** via Foreman: Rails server, `yarn build --watch`, `yarn build:css --watch`, and Sidekiq.
- Full native/Docker setup notes: **`LOCAL_SETUP.md`** and **`README.md`**.

## Tests and CI

```bash
bundle exec rspec
bundle exec rspec spec/models/    # examples — narrow paths as needed
```

CI (`.github/workflows/ci.yml`) runs **`bin/rubocop -f github`**, **`bin/brakeman --no-pager`**, and **`bundle exec rspec`** (with PostgreSQL and `yarn install` for assets tooling). Details and optional **Sentry** / **Dependabot**: [`docs/agents.md`](docs/agents.md).

## Environment variables

**Do not paste secrets into chat or into this file.** Names and purpose are documented in **`README.md`** and **`/.env.example`**. Typical needs for AI feedback features: database URL, Redis URL, `ANTHROPIC_API_KEY`, integration secrets, `LOCKBOX_MASTER_KEY`, `SECRET_KEY_BASE`.

## Where things live

| Path | Contents |
|------|----------|
| `app/controllers/` | Web, API, webhooks (Linear, Slack) |
| `app/models/` | Domain models |
| `app/services/` | AI processing, integrations, pulse generation |
| `app/jobs/` | Sidekiq jobs (batch processing, Google sync, daily email) |
| `config/` | Routes, Sidekiq, credentials patterns |
| `db/` | Migrations and schema |

Sidekiq Web UI: **`/sidekiq`** (admin-only per app rules).

## Conventions

- Follow **RuboCop** as configured; use **`bin/rubocop`** to check.
- Prefer existing patterns in `app/services/` and `app/jobs/` for new behavior.
- Migrations: reversible when possible; avoid destructive changes without a clear rollout story.
- Product-facing or integration changes: consider webhooks, encrypted credentials (Lockbox), and background retries.

## Claude Code skills

Reusable workflows live under **`.claude/skills/<skill-name>/SKILL.md`**. To refresh recommendations for *additional* skills, use **`auto-skill-setup`**.

**Authoritative list (auto-generated from each skill’s YAML frontmatter):** [`docs/skills-and-agents.md`](docs/skills-and-agents.md) — run **`bin/document-skills-and-agents`** after adding or renaming skills (CI enforces this).

**Skills in this repo** (short index; keep in sync via the script above):

| Skill folder | Focus |
|--------------|--------|
| `auto-skill-setup` | Scan repo and suggest/scaffold skills |
| `skills-and-agents-documenter` | Regenerate `docs/skills-and-agents.md` inventory |
| `ship-rails-feature` | Rails 8 + Hotwire + Tailwind feature work |
| `database-migrations-rollout` | PostgreSQL migrations and deploy safety |
| `sidekiq-jobs-and-schedules` | Background jobs and cron |
| `webhooks-integration-safety` | Linear / Slack / Jira webhooks |
| `public-api-feedback` | `POST /api/v1/feedback` |
| `ai-feedback-pipeline` | Anthropic processing in `app/services/ai/` |
| `encrypted-integrations` | Lockbox and `Integration` credentials |
| `email-pulse-and-recipients` | Digest email and pulse reports |
| `product-ui-pr-review` | User-visible / release-note checklist |
| `test-and-ci-gate` | RSpec, RuboCop, Brakeman like CI |
| `docker-and-local-dev` | Docker Compose / local env alignment |
| `dev-documentation` | Internal README, setup, CLAUDE.md, tooling docs |
| `customer-documentation` | User/admin docs, onboarding, integrations, API for integrators |
| `security-pii-review` | PII, logging, secrets, Lockbox, webhook safety |
| `incident-triage-production` | Production incidents, Sentry, Sidekiq, rollback |
| `dependency-upgrade-rails` | Gem/Rails upgrades and Dependabot PRs |
| `performance-n-plus-one` | Query batching, N+1, job chunk sizes |
| `commit-message-conventions` | Commit and PR title style |
| `backfill-data-migration` | Data backfills separate from schema migrations |
