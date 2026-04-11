#!/usr/bin/env bash
set -o errexit
yarn install --frozen-lockfile
export AUTH_SECRET="${AUTH_SECRET:-build-placeholder-min-32-characters-long}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
yarn build:web
