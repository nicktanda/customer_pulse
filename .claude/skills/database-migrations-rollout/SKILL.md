---
name: database-migrations-rollout
description: >-
  Safely add or change PostgreSQL schema in this app: migrations, reversibility,
  data backfills, and deploy ordering. Use when editing db/migrate, schema.rb,
  or planning destructive column/table changes.
---

# Database migrations and rollout

The app uses **PostgreSQL** and standard Rails migrations under **`db/migrate/`**. Production rollout should stay predictable: reversible migrations when possible, and clear stories for long-running backfills.

## When to use

- Creating or editing **`db/migrate/*.rb`**.
- Adding indexes, foreign keys, or NOT NULL constraints on large tables.
- Renaming columns or tables used by jobs, webhooks, or the API.

## Steps

1. Prefer **reversible** `change` methods or explicit `up`/`down` with inverse operations.
2. Check **`db/schema.rb`** and models in **`app/models/`** for validations and callbacks that assume column presence.
3. For risky changes (drops, renames), grep for usages across **`app/`**, **`spec/`**, and **`app/jobs/`**.
4. Run locally: **`bin/rails db:migrate`** and then **`bundle exec rspec`** (or targeted specs).
5. If a deploy needs multiple phases (add column → backfill → add constraint), describe the phases in the PR so reviewers can follow the rollout.

## Notes

- Avoid blocking migrations on huge tables without a strategy (background job, batched updates, or maintenance window).
- See **`CLAUDE.md`** for high-level DB conventions.
