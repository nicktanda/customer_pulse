---
name: test-and-ci-gate
description: >-
  Run the same checks as GitHub Actions before push: web ESLint, Vitest (db, web,
  worker), worker TypeScript build, Next production build, and skills inventory.
  Use when finishing a change, fixing CI failures, onboarding, or keeping unit
  tests aligned with new behavior.
---

# Test and CI gate

GitHub Actions ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)) runs:

| Job | What it does |
|-----|----------------|
| `lint_web` | `yarn workspace web lint` |
| `test_typescript` | `yarn test:db`, `yarn test:web`, `yarn test:worker`, `yarn workspace worker build`, `yarn build:web` (with `AUTH_SECRET` + `NEXTAUTH_URL` for the Next build) |
| `docs_inventory` | `node scripts/document-skills-and-agents.mjs --check` |

Overview of automation: **[`docs/agents.md`](../../../docs/agents.md)**. Generated skill index: **[`docs/skills-and-agents.md`](../../../docs/skills-and-agents.md)**.

## Test layout (where to add tests)

| Package | Command | Files | What belongs here |
|---------|---------|-------|-------------------|
| `packages/db` | `yarn test:db` | `packages/db/src/**/*.test.ts` | Lockbox, schema-adjacent pure helpers |
| `apps/web` | `yarn test:web` | `apps/web/src/**/*.test.ts` | Zod schemas, crypto, enum coercion, URL/slug helpers, anything importable without a running server |
| `apps/worker` | `yarn test:worker` | `apps/worker/src/**/*.test.ts` | Pure worker utilities (e.g. JSON fence stripping, shared Zod with web) |

**Prefer colocated tests:** add `something.test.ts` next to `something.ts` (or under the same folder) so the contract stays obvious.

**Avoid in unit tests:** full Next.js route handlers that need Postgres/Redis unless you add dedicated integration tooling later — instead export **schemas and pure functions** from `lib/` (see `feedback-public-api-body.ts` + `feedback-public-api-body.test.ts`).

## Keeping tests up to date when you ship

When you change behavior, update tests in the same PR (CI will fail if you break existing tests).

1. **New pure logic** (validation, parsing, enum mapping, crypto): add or extend a `*.test.ts` in the same package.
2. **Public API or webhook JSON shape:** add/adjust Zod tests; if the schema lived only in a route, move it to `apps/web/src/lib/` and import from the route so Vitest can cover it.
3. **Worker + web duplicates** (e.g. reporting JSON): if comments say “keep in sync”, add a test on both sides or share one module — worker Vitest catches worker-side drift.
4. **DB enum integers:** if you change `packages/db` enums, grep for string keys (`"p1"`, `"bug"`) in tests and update expectations; see `docs/next-migration/PARITY_MATRIX.md`.

Then run the full local gate (below).

## When to use

- Before opening or updating a PR.
- After refactors that touch many packages.
- When CI fails on lint, tests, or the skills doc check.
- After adding features that should have regression tests.

## Steps

**Fast path (mirrors CI in one command):** from the repo root run **`yarn ci:local`** (or **`yarn ci:local:full`** to run `yarn install --frozen-lockfile` first). See root `package.json`.

**Step-by-step (same as `ci:local` internals):**

1. From the repo root: **`yarn test`** — runs db Vitest, web Vitest, worker Vitest, then worker `tsc`.
2. **`yarn workspace web lint`** on changed web files.
3. **`yarn build:web`** with `AUTH_SECRET` and `NEXTAUTH_URL` set if the build needs them (same as CI). `yarn ci:local` sets the same values CI uses.
4. **`node scripts/document-skills-and-agents.mjs --check`** — fails if `docs/skills-and-agents.md` is stale. To fix: **`yarn document-skills`**, then commit the updated file if you changed `.claude/skills/` or CI/Dependabot metadata that feeds the inventory.

## Notes

- Worker code is still typechecked via **`yarn workspace worker build`** (part of `yarn test`).
- See **`CLAUDE.md`** for quick command reference.
