#!/usr/bin/env sh
# One-line setup: install deps, run DB migrations, restart dev server.
# Usage: ./scripts/setup.sh
set -e
cd "$(dirname "$0")/.."

echo "==> Installing dependencies..."
yarn install --ignore-engines

echo "==> Running database migrations..."
node --env-file=.env scripts/ensure-users-schema.mjs
node --env-file=.env scripts/ensure-projects-membership-tables.mjs

echo "==> Done! Starting dev server..."
exec yarn dev
