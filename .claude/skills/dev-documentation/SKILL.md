---
name: dev-documentation
description: >-
  Writes or updates internal developer documentation: README, setup guides, CLAUDE.md,
  architecture notes, env var references, and code-adjacent docs. Use when onboarding
  developers, changing how the app is run or deployed, or after stack/tooling changes.
---

# Developer documentation

**Developer docs** explain how to **install, run, test, and change** this codebase. They live mostly in the repo root, **`apps/*`**, **`packages/*`**, and **`docs/`**.

## When to use

- Updating **`README.md`**, **`LOCAL_SETUP.md`**, **`CLAUDE.md`**, or archived reference docs under **`docs/archive/`** when something material changes.
- Regenerating **[`docs/skills-and-agents.md`](../../../docs/skills-and-agents.md)** with **`yarn document-skills`** after skill or workflow changes (see **`skills-and-agents-documenter`**).
- Documenting new **env vars** (names and purpose only — see **`.env.example`**).
- Adding **`docs/`** notes (including **[`docs/agents.md`](../../../docs/agents.md)** for CI and automation), ADRs, or **`.github/`** contributor hints if the project uses them.
- After changing **`bin/dev`**, **Docker**, **CI**, or **Node/Yarn** dependencies so the “how to run” story stays true.

## Steps

1. **Find the source of truth** — Prefer linking to one place (e.g. README points to LOCAL_SETUP for long setup). Avoid duplicating the same steps in three files.
2. **Commands must be copy-pasteable** — Use exact commands that match **`CLAUDE.md`** and **`.github/workflows/ci.yml`** (e.g. **`yarn test`**, **`yarn workspace web lint`**, **`yarn build:web`**).
3. **Secrets** — Document variable **names** and where to obtain keys (e.g. “Anthropic console”); never paste real keys or example keys that look live.
4. **Stack facts** — Node **20+**, **Yarn** workspaces from root **`package.json`** / README; **`apps/web`** (Next.js 15, port **3001** dev), **`apps/worker`** (BullMQ, Bull Board **3002** dev), **`packages/db`** (Drizzle). Update when dependencies or ports change.
5. **Cross-check** — After editing setup docs, skim **`Procfile.dev`** and **`docker-compose.yml`** (if present) so ports and services match what you wrote.

## Notes

- **Internal audience**: teammates and future you. Tone can be technical.
- **Not** end-user help copy — for that, use the **`customer-documentation`** skill.
