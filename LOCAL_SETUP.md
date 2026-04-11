# Local setup (TypeScript stack)

## Prerequisites

- **Node.js 20+** and **Yarn** (Classic 1.x)
- **PostgreSQL 14+** and **Redis 7+** running locally, *or* **Docker Compose** (`docker compose up`)

## Steps

1. **Install dependencies**

   ```bash
   yarn install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with at least `DATABASE_URL`, `REDIS_URL`, and `LOCKBOX_MASTER_KEY` (64 hex chars, same as before if you already had integrations). For Auth.js add `AUTH_SECRET` (e.g. `openssl rand -base64 32`) and `NEXTAUTH_URL=http://localhost:3001`.

   Copy into the Next app if you use separate files:

   ```bash
   cp .env apps/web/.env.local
   cp .env apps/worker/.env
   ```

3. **Database**

   Use an existing database that already has the `users` / `projects` / `feedbacks` tables (e.g. a shared or legacy Postgres), **or** apply schema with Drizzle from `packages/db` (`drizzle-kit push` / your migration process — see `db/README.md`).

4. **Dev users**

   ```bash
   node scripts/bootstrap-dev-user.mjs
   ```

5. **Run**

   ```bash
   yarn dev
   ```

## Docker

From the repo root:

```bash
docker compose up
```

Web listens on **3001**. Set `AUTH_SECRET` in the environment or `.env` for compose overrides.

## Troubleshooting

- **`relation "project_users" does not exist` (500 on `/app`)**: Your Postgres database is missing core membership tables (partial or empty schema). From the repo root run `yarn db:ensure-membership` (uses `.env` / `apps/web/.env.local` for `DATABASE_URL`). For a **brand-new** database you can instead apply the full Drizzle baseline: `cd packages/db && node --env-file=../../.env ../../node_modules/drizzle-kit/bin.cjs migrate` (only if tables are not already partially created from an older stack).
- **Login fails**: Re-run `bootstrap:dev-users`; confirm `users.encrypted_password` is bcrypt and email matches.
- **API / integrations**: Confirm `LOCKBOX_MASTER_KEY` matches the key used when credentials were encrypted.
- **Jobs not running**: Start `yarn dev:worker` and ensure `REDIS_URL` is correct.
