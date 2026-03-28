# Automation (“agents”) for Customer Pulse

This doc describes **automated workflows** that run **outside** Claude Code sessions: CI, bots, and optional error tracking. **Skills** (`.claude/skills/*/SKILL.md`) are *instructions* for Claude; this file is about *what runs on GitHub and in production*.

**Machine-readable inventory** (all skill folders + CI/Dependabot/Sentry signals): **[`docs/skills-and-agents.md`](skills-and-agents.md)** — regenerate with **`bin/document-skills-and-agents`** (see skill **`skills-and-agents-documenter`**).

## Continuous integration (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | What it does |
|-----|----------------|
| `scan_ruby` | `bin/brakeman` — static security scan |
| `lint` | `bin/rubocop -f github` |
| `test` | PostgreSQL service + `yarn install` + `bin/rails db:test:prepare` + `bundle exec rspec` |
| `docs_inventory` | `bin/document-skills-and-agents --check` — keeps [`skills-and-agents.md`](skills-and-agents.md) in sync with `.claude/skills` and config |

Runs on **pull requests** and **pushes to `main`**. Local parity: use the **`test-and-ci-gate`** skill and run the same commands before pushing.

## Dependabot

Config: [`.github/dependabot.yml`](../.github/dependabot.yml)

Opens weekly PRs for **Bundler**, **npm**, and monthly for **GitHub Actions**. Merge after CI is green.

## Sentry (optional error tracking)

- **Gem:** `sentry-rails` (production group in `Gemfile`).
- **Config:** [`config/initializers/sentry.rb`](../config/initializers/sentry.rb) — initializes only when `Sentry` is loaded and **`SENTRY_DSN`** is set.
- **Env:** add **`SENTRY_DSN`** in production (see **`.env.example`** for the variable name). Create a project in [Sentry](https://sentry.io/) and paste the DSN into your host’s secrets — never commit it.

When enabled, use the **`incident-triage-production`** skill with Sentry issue links.

## Future ideas (not configured in-repo)

| Idea | Notes |
|------|--------|
| **LLM PR review** | GitHub Action that posts a review from Anthropic/OpenAI using a short prompt; store API key in repo **secrets**; optional rubric from a skill. |
| **Stale / label bots** | Third-party GitHub apps or Actions. |
| **Log drain → alert → Claude** | Use Sentry/PagerDuty first; any “auto-fix” loop should stay human-supervised. |

For day-to-day coding, prefer **skills** plus **CI** over bespoke agents until you have a clear trigger and owner.
