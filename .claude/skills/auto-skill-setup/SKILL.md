---
name: auto-skill-setup
description: >-
  Scans the repository structure and docs, then recommends a prioritized set of
  Claude Code skills focused on product development (shipping, reviews, releases,
  user-visible and integration changes, developer documentation, and customer-facing
  documentation). Optionally scaffolds new skill folders under .claude/skills/ from
  the bundled template. Use when onboarding a repo, after major stack changes, or when
  the user asks to generate or refresh recommended skills.
---

# Auto skill setup (meta-skill)

This skill tells **you** (Claude) how to analyze **this codebase** and produce **actionable skill recommendations** for **product development**—not only generic linting. A "skill" here is a folder `.claude/skills/<name>/SKILL.md` consumed by Claude Code.

---

## Phase 1 — Discover signals (read, do not dump secrets)

Scan what actually exists; skip missing paths without error.

1. **Project intent:** **`CLAUDE.md`**, **`README.md`**, and **`docs/next-migration/PARITY_MATRIX.md`** (legacy DB / enum parity). Optional archive context: **`docs/archive/plans/legacy-rails-project-plan.md`** if present.
2. **Dependencies:** Root and workspace **`package.json`** / **`yarn.lock`** (Yarn monorepo: `apps/web`, `apps/worker`, `packages/db`).
3. **Automation:** `.github/workflows/*` (CI steps, deploy hints).
4. **How devs run the app:** `Procfile.dev`, `bin/dev`, `docker-compose.yml` / `Dockerfile*` if present.
5. **App layout:** **`apps/web/src/app/`** — public **`api/*`** routes (webhooks, `api/v1/feedback`, Auth.js) and authenticated product UI under **`app/app/`** (URLs like `/app/...`); **`apps/worker/src/`** (BullMQ processors); **`packages/db/src/`** (Drizzle schema, Lockbox).
6. **Tests:** `packages/db` Vitest, `apps/web` Vitest, worker `tsc` via **`yarn test`**.
7. **Env contract:** `.env.example`, `apps/web/.env.example`, `apps/worker/.env.example`, README — **variable names and purpose only**; never echo real secret values from `.env` or elsewhere.
8. **Documentation signals:**
   - **Developer-facing:** `README.md`, `LOCAL_SETUP.md`, `CLAUDE.md`, `docs/` (e.g. **`docs/agents.md`** for CI, Dependabot, Sentry), `.github/` templates, comments in `bin/*` and Docker files.
   - **Customer / integrator-facing:** in-app copy under **`apps/web/src/app/app/`** (onboarding, settings, integrations), email-related UI, and README sections that describe integrations or the public API for non-developers.

From this, **summarize stack and workflows** in a short paragraph (e.g. "Next.js 15 + BullMQ + Redis + Drizzle/Postgres; Vitest in db/web packages; Linear/Slack webhooks").

---

## Phase 2 — Recommend skills (prioritized for product development)

Output a **markdown list** (or table) of **recommended new skills**. For each row include:

| Column | Meaning |
|--------|---------|
| **name** | Kebab-case folder name under `.claude/skills/` |
| **purpose** | One line: what the skill helps with |
| **when to use** | Triggers (user asks X, or file area Y changes) |
| **why this repo** | Tie to something you saw in Phase 1 |

**Group** skills optionally under headings such as:

- **Core shipping** — feature work, DB changes, API/webhooks
- **Quality** — tests, security review, regression risks
- **Ops / release** — Drizzle migrations in prod, BullMQ workers, monitoring, rollbacks
- **Documentation** — internal dev docs vs customer-facing docs (see below)

**Include product-oriented examples only when justified** by the scan, e.g.:

- PR checklist for user-visible UI or email copy
- Changelog / release note prompts
- Integration or webhook change checklist (signatures, idempotency, retries)
- Background job and cron safety (**BullMQ** repeatables)
- AI or external API behavior changes (cost, failure modes)
- **`dev-documentation`** — README / setup / `CLAUDE.md` / tooling changes; keeping install and test instructions accurate
- **`customer-documentation`** — onboarding, integration setup, API docs for integrators, digest/email explanations; anything a customer or admin reads

When the repo has both audiences (engineers + customers/admins), recommend **both** documentation skills if they are not already present under `.claude/skills/`.

- **`security-pii-review`** — feedback, webhooks, AI, integrations (PII and secrets)
- **`incident-triage-production`** — when CI/docs mention Sentry, production, or on-call
- **`dependency-upgrade-node`** — Dependabot npm PRs or workspace version bumps
- **`performance-n-plus-one`** — slow dashboards, large feedback lists, job batching
- **`commit-message-conventions`** — team asks for commit/PR title standards
- **`backfill-data-migration`** — data fixes separate from Drizzle schema migrations

If **`docs/agents.md`** (or similar) exists, use it to infer **CI, Dependabot, and error-tracking** automation already in place. If **`docs/skills-and-agents.md`** exists, treat it as the **generated index** of skills and automation (see **`skills-and-agents-documenter`**).

**Do not** recommend duplicate skills that already exist: list `.claude/skills/` directories first and **omit or merge** overlaps.

---

## Phase 3 — Optional scaffold (only if the user asks)

If the user explicitly asks you to **create** or **scaffold** skills (e.g. "create the top 3"):

1. Read the template file at **`.claude/skills/auto-skill-setup/references/skill-template.md`**.
2. For each chosen skill, create **`.claude/skills/<kebab-name>/SKILL.md`** by copying the template structure and filling in **real** `name`, `description`, and body tailored to this repository.
3. **Never overwrite** an existing `.claude/skills/<name>/` directory. If a name collides, **skip** or **ask** for a new name.
4. Keep each skill **one workflow**; link to paths under `apps/web`, `apps/worker`, or `packages/db` where helpful.
5. Regenerate the inventory: run **`yarn document-skills`** from the repo root and **commit** **`docs/skills-and-agents.md`** together with the new skill (CI **`docs_inventory`** job enforces this).

---

## Safety rules

- **No secrets** in output: no API keys, tokens, or contents of `.env`.
- Prefer pointing to **`.env.example`** and README for env var **names**.

---

## Quick reference — template path

Scaffold new skills from:

` .claude/skills/auto-skill-setup/references/skill-template.md `
