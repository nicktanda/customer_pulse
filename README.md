# xenoform.ai

Customer feedback from Linear, Slack, Jira, Google Forms, and a custom API lands in **PostgreSQL**. Workers process feedback with the **Anthropic** API and send a daily **xenoform.ai** pulse digest.

## Stack

- **Web & API**: Next.js 15 (`apps/web`) — UI, Auth.js, webhooks, `POST /api/v1/feedback`
- **Jobs**: BullMQ + Redis (`apps/worker`) — syncs, AI feedback processing, scheduled mail (see [PARITY_MATRIX](docs/next-migration/PARITY_MATRIX.md) for legacy parity and known gaps)
- **Database**: PostgreSQL — Drizzle schema in `packages/db`
- **Secrets**: Integration credentials encrypted with **Lockbox**-compatible crypto (`LOCKBOX_MASTER_KEY`)

**Prerequisites:** Node **20+** and **Yarn** (workspaces at repo root).

## Quick start

```bash
yarn install
cp .env.example .env
# Edit .env: DATABASE_URL, REDIS_URL, LOCKBOX_MASTER_KEY, ANTHROPIC_API_KEY, AUTH_SECRET, NEXTAUTH_URL, etc.

# Apply schema/migrations to Postgres when setting up (see db/README.md and packages/db if unsure):
yarn db:migrate

# Create dev users (seed-style admin + viewer accounts):
node --env-file=.env scripts/bootstrap-dev-user.mjs

yarn dev
```

- **App**: http://localhost:3001  
- **Login**: `admin@example.com` / `password123` or `viewer@example.com` / `password123` (from bootstrap script)

Single-process web only: `yarn dev:web`. Worker + Bull Board: `yarn dev:worker` (Board default http://localhost:3002, path often `/admin/queues` — see `apps/worker/.env.example`).

`bin/dev` is the same as `yarn dev`.

## Reviewing the Next.js migration (Nick)

If you are **reviewing or QA’ing** the Rails → TypeScript cutover, start here:

- **[NEXTJS_REFACTOR_REVIEW_FOR_NICK.md](NEXTJS_REFACTOR_REVIEW_FOR_NICK.md)** — branch expectations, repo map, suggested PR reading order, manual test checklist, and secrets hygiene (do not commit `.env` or `apps/web/.env.local`).
- **[docs/next-migration/PARITY_MATRIX.md](docs/next-migration/PARITY_MATRIX.md)** — authoritative route/job/enum checklist vs legacy; keep it open during review.

Work may land on a feature branch (e.g. `nextjs-refactor`) before `main`; match the PR branch your teammate gives you and pull the latest.

## Useful commands

| Command | Purpose |
|--------|---------|
| `yarn dev` | Next (3001) + worker |
| `yarn build` | Production build web + worker |
| `yarn test` | Vitest (db, web, worker) + worker `tsc` |
| `yarn ci:local` | Same gate as CI before push: web lint, tests, Next production build, skills doc `--check` |
| `yarn ci:local:full` | `yarn install --frozen-lockfile`, then `ci:local` |
| `yarn workspace web lint` | ESLint (Next) |
| `yarn db:migrate` | Run Drizzle migrations (from root; uses root `.env`) |
| `yarn document-skills` | Regenerate `docs/skills-and-agents.md` |
| `yarn bootstrap:dev-users` | Upsert admin/viewer dev users (reads `.env` / `apps/web/.env.local`) |

## Docker

```bash
docker compose up
```

Then open http://localhost:3001. Run bootstrap against the compose DB from your host (with `DATABASE_URL` pointing at `localhost:5432`) or exec into a container.

## Docs

- [CLAUDE.md](CLAUDE.md) — AI/editor context
- [NEXTJS_REFACTOR_REVIEW_FOR_NICK.md](NEXTJS_REFACTOR_REVIEW_FOR_NICK.md) — reviewer / QA guide for the Next.js stack
- [docs/next-migration/PARITY_MATRIX.md](docs/next-migration/PARITY_MATRIX.md) — enum/route parity vs the legacy app
- [docs/archive/next-migration/](docs/archive/next-migration/) — archived cutover, auth, Lockbox, observability notes
- [docs/archive/plans/](docs/archive/plans/) — archived plans (Rails-era product doc + Cursor `*.plan.md` notes)
- [LOCAL_SETUP.md](LOCAL_SETUP.md) — environment notes
- [db/README.md](db/README.md) — database setup pointers (Drizzle lives under `packages/db`)

## Environment variables

See [.env.example](.env.example), [apps/web/.env.example](apps/web/.env.example), and [apps/worker/.env.example](apps/worker/.env.example).
