#!/usr/bin/env sh
# One-line setup: install deps, sync env, create DB schema, run migrations, start dev server.
# Usage: ./scripts/setup.sh
set -e
cd "$(dirname "$0")/.."

echo "==> Installing dependencies..."
yarn install --ignore-engines

echo "==> Syncing root .env → apps/web/.env.local and apps/worker/.env ..."
if [ -f .env ]; then
  cp .env apps/web/.env.local
  cp .env apps/worker/.env
  echo "    Copied .env to apps/web/.env.local and apps/worker/.env"
else
  echo "    No root .env found — skipping. Copy .env.example to .env and fill it in."
fi

echo "==> Pushing Drizzle schema to database..."
yarn workspace @customer-pulse/db push

echo "==> Running additional migrations..."
node --env-file=.env scripts/ensure-users-schema.mjs
node --env-file=.env scripts/ensure-projects-membership-tables.mjs

echo "==> Done! Starting dev server..."
exec yarn dev
