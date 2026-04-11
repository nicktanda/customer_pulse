# Customer Pulse — Claude Code project context

This file is read by **Claude Code** so every session starts with accurate project facts. Update it when the stack or commands change.

## What this app is

**Customer Pulse** ingests customer feedback from Linear, Google Forms, Slack, Jira, and a custom API, stores it in **PostgreSQL**, and uses the **Anthropic API** to classify and triage items. It sends a daily email digest (“Customer Pulse”). The app is a **TypeScript monorepo**: **Next.js** (App Router) for the web UI and HTTP APIs, **BullMQ** workers for background jobs, **Drizzle** for the DB schema, and **Auth.js** for login (JWT sessions; bcrypt-compatible with existing `users.encrypted_password` hashes).

## Stack (high level)

| Area | Choice |
|------|--------|
| Web + API | **Next.js 15** (`apps/web`) |
| Worker + cron | **BullMQ** + Redis (`apps/worker`) |
| DB | **PostgreSQL** — schema in `packages/db` (Drizzle) |
| ORM | **Drizzle** + `postgres` driver |
| Auth | **Auth.js** (credentials + optional Google OAuth) |
| Encryption | **Lockbox-compatible** helpers in `packages/db` (`LOCKBOX_MASTER_KEY`) |
| Tests | **Vitest** (`packages/db`, `apps/web`, `apps/worker`); worker also typechecked via `tsc` |

Node **20+**, **Yarn** workspaces.

## Running locally

From the repo root:

```bash
yarn install
cp .env.example .env   # then edit — never commit real secrets
# If the DB has no users yet:
node --env-file=.env scripts/bootstrap-dev-user.mjs
yarn dev               # Next (3001) + worker, or: yarn dev:web only
```

- **`yarn dev`**: Next.js dev server and BullMQ worker (see root `package.json`).
- **`bin/dev`**: same as `yarn dev`.
- Docker: **`docker compose up`** — see `docker-compose.yml` (web on **3001**).

## Tests and CI

**Same checks as GitHub Actions before you push:**

```bash
yarn ci:local          # web lint + yarn test + Next production build (CI auth env) + skills doc --check
yarn ci:local:full     # yarn install --frozen-lockfile, then ci:local
```

Individual steps (see `.github/workflows/ci.yml`):

```bash
yarn test              # db + web + worker Vitest, then worker tsc
yarn workspace web lint
# Next build needs AUTH_SECRET + NEXTAUTH_URL (set in your .env or match CI):
AUTH_SECRET='ci-test-secret-at-least-32-chars-long!!' NEXTAUTH_URL='http://localhost:3001' yarn build:web
node scripts/document-skills-and-agents.mjs --check
```

## Environment variables

**Do not paste secrets into chat or into this file.** Names are documented in **`README.md`**, **`/.env.example`**, **`apps/web/.env.example`**, and **`apps/worker/.env.example`**. Typical needs: `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, `LOCKBOX_MASTER_KEY`, integration secrets.

## Where things live

| Path | Contents |
|------|----------|
| `apps/web/src/app` | App Router UI + `api/*` route handlers (webhooks, `api/v1/feedback`, Auth.js) |
| `apps/worker/src` | BullMQ workers, repeatable schedules, Bull Board |
| `packages/db/src` | Drizzle schema, enums, Lockbox, `createDb` |
| `docs/next-migration/PARITY_MATRIX.md` | Legacy route/job → Next.js parity; enum integers |
| `docs/archive/next-migration/` | Archived cutover, auth, Lockbox, observability docs |

Bull Board (queue admin): worker HTTP port (default **3002**), not exposed on the Next app.

## Conventions

- Prefer **Drizzle** + shared enums in `packages/db` for DB access; keep integer enums aligned with `docs/next-migration/PARITY_MATRIX.md` (legacy DB compatibility).
- Long-running or scheduled work belongs in **`apps/worker`**, not in Next route handlers.
- Regenerate **`docs/skills-and-agents.md`** with **`yarn document-skills`** after skill/CI changes (CI enforces).

## Claude Code skills

Reusable workflows live under **`.claude/skills/<skill-name>/SKILL.md`**.

**Authoritative inventory:** [`docs/skills-and-agents.md`](docs/skills-and-agents.md) — run **`yarn document-skills`** after adding or renaming skills.

Skills under `.claude/skills/` target this TypeScript stack (`apps/web`, `apps/worker`, `packages/db`).
