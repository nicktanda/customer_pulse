---
name: dependency-upgrade-node
description: >-
  Plan and execute Node/Yarn dependency upgrades in this monorepo: workspace
  packages, security advisories, and lockfile hygiene. Use when bumping Next.js,
  Drizzle, BullMQ, or root devDependencies, or triaging Dependabot npm PRs.
---

# Dependency upgrades (Node / Yarn workspaces)

This repo is a **Yarn workspaces** monorepo: **`apps/web`**, **`apps/worker`**, **`packages/db`**, and the root **`package.json`**. Upgrades keep the app secure and maintainable; **major** framework bumps (e.g. Next) need extra regression testing.

## When to use

- Editing root or workspace **`package.json`** files, especially **`next`**, **`react`**, **`drizzle-orm`**, **`bullmq`**.
- Large Dependabot PRs or security advisories for npm packages.

## Steps

1. Read the **release notes** for the packages you are bumping (breaking changes, Node version requirements).
2. On a **branch**, run **`yarn install`** (or targeted upgrades with `yarn up` / manual version bumps) and fix TypeScript or build errors.
3. Run **`yarn test`**, **`yarn workspace web lint`**, and **`yarn build:web`** (with `AUTH_SECRET` + `NEXTAUTH_URL` if required) — same expectations as CI (**`test-and-ci-gate`**).
4. For Drizzle or DB driver changes, run **`yarn test:db`**, regenerate migrations if needed (**`yarn workspace @customer-pulse/db generate`**), and verify **`yarn db:migrate`** against a dev database.

## Notes

- Merge **one logical upgrade at a time** when possible (framework vs. unrelated tooling).
- Keep **`yarn.lock`** commits paired with **`package.json`** changes.
