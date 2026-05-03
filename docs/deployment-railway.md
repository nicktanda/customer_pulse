# Deploying xenoform.ai on Railway + Neon

This guide walks through deploying xenoform.ai as a multi-tenant app using **Railway** (web + worker + Redis) and **Neon** (Postgres).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Railway Project                                     │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Web Service  │  │   Worker     │  │   Redis   │  │
│  │  (Next.js)   │  │  (BullMQ)    │  │           │  │
│  │  Port 3000   │  │  Port 3002   │  │  Port 6379│  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                 │                 │        │
└─────────┼─────────────────┼─────────────────┼────────┘
          │                 │                 │
          ▼                 ▼                 │
┌─────────────────────────────────────┐       │
│  Neon Postgres                      │◄──────┘
│                                     │
│  ┌─────────────────┐                │
│  │ control_plane   │  (tenants,     │
│  │                 │   users, auth) │
│  ├─────────────────┤                │
│  │ tenant_acme     │  (projects,    │
│  │                 │   feedback...) │
│  ├─────────────────┤                │
│  │ tenant_widgets  │                │
│  └─────────────────┘                │
└─────────────────────────────────────┘
```

## Prerequisites

- A [Railway](https://railway.com) account (Pro plan for wildcard domains, $5/mo)
- A [Neon](https://neon.tech) account (free tier works to start)
- A domain you control (e.g. `xenoform.ai`)
- `railway` CLI installed: `npm i -g @railway/cli`

## Step 1: Set up Neon

1. Create a new Neon project (e.g. `customer-pulse-prod`)
2. Note the **connection string** — this will be your `CONTROL_PLANE_DATABASE_URL`
3. Create a second database in the project called `control_plane`:
   - Go to **Databases** in the Neon console
   - Click **New Database**, name it `control_plane`
   - Copy its connection string (same host, different database name)

You'll use the `control_plane` database connection string as `CONTROL_PLANE_DATABASE_URL`. Tenant databases will be created programmatically in this same Neon project.

## Step 2: Create the Railway project

```bash
# Login to Railway
railway login

# Create a new project
railway init
```

### Add Redis

1. In the Railway dashboard, open your project
2. Click **+ New** → **Database** → **Redis**
3. Railway provisions Redis and exposes `REDIS_URL` automatically

### Create the Web service

1. Click **+ New** → **Docker Image** (or **GitHub Repo** if you prefer Git deploys)
2. Name it `web`
3. Set the **Dockerfile path** to `Dockerfile.web`
4. Set the following **environment variables**:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MULTI_TENANT` | `true` |
| `DATABASE_URL` | *(Neon control plane connection string — fallback for single-tenant compat)* |
| `CONTROL_PLANE_DATABASE_URL` | *(Neon `control_plane` database connection string)* |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` *(Railway variable reference)* |
| `AUTH_SECRET` | *(generate with `openssl rand -base64 32`)* |
| `NEXTAUTH_URL` | `https://xenoform.ai` |
| `AUTH_COOKIE_DOMAIN` | `.xenoform.ai` |
| `APP_BASE_DOMAIN` | `xenoform.ai` |
| `LOCKBOX_MASTER_KEY` | *(generate with `openssl rand -hex 32`)* |
| `RESEND_API_KEY` | *(from resend.com, for email)* |
| `ANTHROPIC_API_KEY` | *(optional — or set per-tenant via integrations UI)* |

### Create the Worker service

1. Click **+ New** → **Docker Image** (or **GitHub Repo**)
2. Name it `worker`
3. Set the **Dockerfile path** to `Dockerfile.worker`
4. Set the **same environment variables** as the web service (they share the same DB and Redis)
5. Additionally set:

| Variable | Value |
|----------|-------|
| `BULL_BOARD_PORT` | `3002` |
| `BULL_BOARD_USER` | *(pick a username)* |
| `BULL_BOARD_PASS` | *(pick a password)* |

**Tip:** Use Railway's **shared variables** feature to define common env vars (DATABASE_URL, REDIS_URL, LOCKBOX_MASTER_KEY, etc.) once at the project level and reference them in both services.

## Step 3: Set up the domain

### DNS

Add these records to your domain registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | `@` | *(Railway-provided domain for the web service)* |
| CNAME | `*` | *(same Railway-provided domain)* |

### Railway custom domain

1. Go to **web** service → **Settings** → **Networking** → **Custom Domain**
2. Add `xenoform.ai`
3. Add `*.xenoform.ai` (wildcard)
4. Railway provisions TLS certificates automatically

## Step 4: Run initial migrations

From your local machine, with `.env` configured to point at the Neon production databases:

```bash
# Push the control plane schema
CONTROL_PLANE_DATABASE_URL="postgres://...your-neon-control-plane-url..." \
  npx drizzle-kit push --config=packages/db/drizzle-control-plane.config.ts
```

Or if you have Railway CLI connected:

```bash
# Run migrations via Railway (uses the service's env vars)
railway run -s web -- npx drizzle-kit push --config=packages/db/drizzle-control-plane.config.ts
```

## Step 5: Create your first tenant

Visit `https://xenoform.ai/signup`, create an account, and finish the onboarding wizard.

What happens under the hood:

1. `POST /api/auth/register` writes the user into the **control plane** `users` table (not a tenant DB).
2. Onboarding's "Create workspace" step calls `provisionTenant()` which:
   - `CREATE DATABASE tenant_<slug>` on Neon using your `CONTROL_PLANE_DATABASE_URL`
   - Applies the tenant schema via `npx drizzle-kit push` (blocks ~5–10s on a cold Neon compute)
   - Inserts a `tenants` row + `tenant_memberships` row, mirrors the user into the tenant DB
   - Sets the `current_project_id` cookie on `.<APP_BASE_DOMAIN>` so the cookie follows the user across subdomains
3. The browser is redirected to `https://<slug>.xenoform.ai/app`.

Because the schema push runs from the web container, the image must include `drizzle-kit` (already installed via `yarn install --frozen-lockfile` — don't switch to `--production`).

## Step 6: Deploy

### Git-based deploys (recommended)

1. Connect your GitHub repo to the Railway project
2. Set the **root directory** to `/` for both services
3. Set the **Dockerfile** path per service (`Dockerfile.web` / `Dockerfile.worker`)
4. Every push to `main` triggers a deploy

### CLI deploys

```bash
# Deploy from local
railway up -s web
railway up -s worker
```

## Ongoing operations

### Adding a new tenant

New tenants are provisioned through the app's signup flow:
1. User signs up at `xenoform.ai/signup`
2. App creates user in control plane
3. Onboarding asks for organization name
4. App provisions a new Neon database, runs migrations, creates the tenant record

### Running migrations

When you change the Drizzle schema, migrations need to run against:

1. **Control plane:** `yarn db:migrate:cp`
2. **All tenant databases:** `yarn db:migrate:tenants`

Via Railway:

```bash
# Control plane migrations
railway run -s web -- yarn db:migrate:cp

# All tenant databases
railway run -s web -- yarn db:migrate:tenants
```

### Monitoring

- **Railway dashboard** — logs, metrics, restarts for web + worker
- **Bull Board** — accessible on the worker service at port 3002 (add the port in Railway networking settings if you want external access, or use `railway run` to port-forward)
- **Neon console** — database metrics, query insights, branching

### Scaling

- **Web:** Railway auto-scales horizontally. Add replicas in service settings.
- **Worker:** For more throughput, increase the worker replica count. BullMQ handles concurrent processing across replicas automatically via Redis locking.
- **Database:** Neon auto-scales compute. For high-traffic tenants, consider moving them to their own Neon project.
- **Redis:** Upgrade the Railway Redis plan as queue volume grows.

## Environment variables reference

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `MULTI_TENANT` | Yes (prod) | Both | Set to `true` |
| `CONTROL_PLANE_DATABASE_URL` | Yes | Both | Neon control plane connection string |
| `DATABASE_URL` | Optional | Both | Fallback for single-tenant compat |
| `REDIS_URL` | Yes | Both | Railway Redis URL |
| `AUTH_SECRET` | Yes | Web | Auth.js session signing key |
| `NEXTAUTH_URL` | Yes | Web | `https://xenoform.ai` |
| `AUTH_COOKIE_DOMAIN` | Yes | Web | `.xenoform.ai` |
| `APP_BASE_DOMAIN` | Yes | Web | `xenoform.ai` |
| `LOCKBOX_MASTER_KEY` | Yes | Both | 64 hex chars for credential encryption |
| `RESEND_API_KEY` | Optional | Both | Email delivery |
| `ANTHROPIC_API_KEY` | Optional | Both | AI features (or set per-tenant) |
| `GOOGLE_CLIENT_ID` | Optional | Web | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | Web | Google OAuth |
| `SLACK_SIGNING_SECRET` | Optional | Web | Slack webhook verification |
| `BULL_BOARD_PORT` | Optional | Worker | Bull Board admin UI port |
| `BULL_BOARD_USER` | Optional | Worker | Bull Board auth |
| `BULL_BOARD_PASS` | Optional | Worker | Bull Board auth |

## Cost estimate

| Service | Plan | ~Cost/mo |
|---------|------|----------|
| Railway Pro | subscription | $5 |
| Railway Web | usage-based | ~$5-15 |
| Railway Worker | usage-based | ~$5-10 |
| Railway Redis | usage-based | ~$3-5 |
| Neon Postgres | Free/Launch | $0-19 |
| **Total** | | **~$18-54/mo** |

Costs scale with usage. A low-traffic app with a few tenants will be near the bottom of this range.
