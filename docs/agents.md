# Automation (“agents”) for Customer Pulse

This doc describes **automated workflows** that run **outside** Claude Code sessions: CI, bots, and optional error tracking. **Skills** (`.claude/skills/*/SKILL.md`) are *instructions* for Claude; this file is about *what runs on GitHub and in production*.

**Machine-readable inventory** (skill folders + CI/Dependabot/Sentry signals): **[`docs/skills-and-agents.md`](skills-and-agents.md)** — regenerate with **`yarn document-skills`** (see skill **`skills-and-agents-documenter`**).

## Continuous integration (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | What it does |
|-----|----------------|
| `lint_web` | `yarn workspace web lint` |
| `test_typescript` | `yarn test` (Vitest + worker `tsc`) + `yarn build:web` |
| `docs_inventory` | `node scripts/document-skills-and-agents.mjs --check` — keeps [`skills-and-agents.md`](skills-and-agents.md) in sync |

Runs on **pull requests** and **pushes to `main`**. Before pushing locally: **`yarn test`**, **`yarn workspace web lint`**, and **`yarn build:web`** (with `AUTH_SECRET` and `NEXTAUTH_URL` set if the build needs them).

## Dependabot

Config: [`.github/dependabot.yml`](../.github/dependabot.yml)

Opens weekly PRs for **npm** (repo root workspaces) and monthly for **GitHub Actions**.

## Sentry (optional error tracking)

- **Web:** add `@sentry/nextjs` to `apps/web` and set **`SENTRY_DSN`** in production.
- **Worker:** optional `@sentry/node` in `apps/worker`.

Never commit DSNs; use host secrets.

## Future ideas (not configured in-repo)

| Idea | Notes |
|------|-------|
| **LLM PR review** | GitHub Action with API key in repo **secrets**. |
| **Stale / label bots** | Third-party GitHub apps or Actions. |
| **E2E tests** | Playwright against staging. |

For day-to-day coding, prefer **skills** plus **CI** over bespoke agents until you have a clear trigger and owner.
