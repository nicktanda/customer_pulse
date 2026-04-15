---
name: database-migrations-rollout
description: >-
  Safely add or change PostgreSQL schema with Drizzle: SQL migrations, reversibility,
  data backfills, and deploy ordering. Use when editing packages/db schema, drizzle
  migrations, or planning destructive column/table changes.
---

# Database migrations and rollout

The app uses **PostgreSQL** with **Drizzle ORM** in **`packages/db`**. Schema is **`packages/db/src/schema.ts`** (plus **`enums.ts`**); **drizzle-kit** writes SQL under **`packages/db/drizzle/`** per **`packages/db/drizzle.config.ts`**. Apply migrations in dev/prod with root **`yarn db:migrate`** (loads `.env` from repo root). Production rollout should stay predictable: reversible steps when possible, and clear stories for long-running backfills.

## When to use

- Creating or editing Drizzle schema in **`packages/db/src/`** or new SQL under the migrations folder used by this repo.
- Adding indexes, foreign keys, or NOT NULL constraints on large tables.
- Renaming columns or tables used by workers, webhooks, or the API.

## Steps

1. Update **`packages/db/src/schema.ts`** and **`packages/db/src/enums.ts`** (integer enums must stay aligned with **`docs/next-migration/PARITY_MATRIX.md`** where applicable) so types match the intended database shape.
2. Generate SQL with **`yarn workspace @customer-pulse/db generate`** (or the equivalent from **`packages/db`**) following team conventions; prefer migrations that can be rolled back or applied in phases when tables are large.
3. Grep for usages across **`apps/web`**, **`apps/worker`**, and **`packages/db`** before destructive changes.
4. Run locally: apply migrations against a dev database, then **`yarn test`** (includes db package tests where relevant).
5. If a deploy needs multiple phases (add column → backfill → add constraint), describe the phases in the PR so reviewers can follow the rollout.

## Notes

- Avoid blocking DDL on huge tables without a strategy (batched backfill job, maintenance window).
- Integer enums must stay aligned with values documented in **`docs/next-migration/PARITY_MATRIX.md`** where they mirror legacy DB rows.
- See **`CLAUDE.md`** for high-level DB conventions.
