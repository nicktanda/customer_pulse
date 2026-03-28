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

1. **Project intent:** `README.md`, `PLAN.md` (if present).
2. **Dependencies:** `Gemfile`, `Gemfile.lock` (Ruby/Rails stack), `package.json` (JS/CSS tooling).
3. **Automation:** `.github/workflows/*` (CI steps, deploy hints).
4. **How devs run the app:** `Procfile.dev`, `bin/dev`, `docker-compose.yml` / `Dockerfile*` if present.
5. **Rails layout:** `config/routes.rb`, `config/sidekiq.yml` or initializer, `db/schema.rb` or migrations overview (size/complexity only if useful).
6. **Application code:** `app/controllers/`, `app/models/`, `app/jobs/`, `app/services/`, `app/views/` — enough to see domains (e.g. webhooks, AI, mailers, onboarding).
7. **Tests:** `spec/` vs `test/`, key patterns (requests, system, jobs).
8. **Env contract:** `.env.example` and README env tables — **variable names and purpose only**; never echo real secret values from `.env` or elsewhere.
9. **Documentation signals:**
   - **Developer-facing:** `README.md`, `LOCAL_SETUP.md`, `CLAUDE.md`, `PLAN.md`, `docs/` (e.g. **`docs/agents.md`** for CI, Dependabot, Sentry), `.github/` templates, comments in `bin/*` and Docker files.
   - **Customer / integrator-facing:** in-app copy under `app/views/` (especially onboarding and settings), mailer templates, and README sections that describe integrations or the public API for non-developers.

From this, **summarize stack and workflows** in a short paragraph (e.g. "Rails 8 + Sidekiq + Redis + RSpec; daily digest job; Linear/Slack webhooks").

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
- **Ops / release** — migrations in prod, Sidekiq, monitoring, rollbacks
- **Documentation** — internal dev docs vs customer-facing docs (see below)

**Include product-oriented examples only when justified** by the scan, e.g.:

- PR checklist for user-visible UI or email copy
- Changelog / release note prompts
- Integration or webhook change checklist (signatures, idempotency, retries)
- Background job and cron safety (Sidekiq)
- AI or external API behavior changes (cost, failure modes)
- **`dev-documentation`** — README / setup / `CLAUDE.md` / tooling changes; keeping install and test instructions accurate
- **`customer-documentation`** — onboarding, integration setup, API docs for integrators, digest/email explanations; anything a customer or admin reads

When the repo has both audiences (engineers + customers/admins), recommend **both** documentation skills if they are not already present under `.claude/skills/`.

- **`security-pii-review`** — feedback, webhooks, AI, integrations (PII and secrets)
- **`incident-triage-production`** — when CI/docs mention Sentry, production, or on-call
- **`dependency-upgrade-rails`** — Dependabot, `Gemfile`, or upgrade work
- **`performance-n-plus-one`** — slow dashboards, large `Feedback` lists, job batching
- **`commit-message-conventions`** — team asks for commit/PR title standards
- **`backfill-data-migration`** — data fixes separate from `db/migrate` schema changes

If **`docs/agents.md`** (or similar) exists, use it to infer **CI, Dependabot, and error-tracking** automation already in place. If **`docs/skills-and-agents.md`** exists, treat it as the **generated index** of skills and automation (see **`skills-and-agents-documenter`**).

**Do not** recommend duplicate skills that already exist: list `.claude/skills/` directories first and **omit or merge** overlaps.

---

## Phase 3 — Optional scaffold (only if the user asks)

If the user explicitly asks you to **create** or **scaffold** skills (e.g. "create the top 3"):

1. Read the template file at **`.claude/skills/auto-skill-setup/references/skill-template.md`**.
2. For each chosen skill, create **`.claude/skills/<kebab-name>/SKILL.md`** by copying the template structure and filling in **real** `name`, `description`, and body tailored to this repository.
3. **Never overwrite** an existing `.claude/skills/<name>/` directory. If a name collides, **skip** or **ask** for a new name.
4. Keep each skill **one workflow**; link to paths under `app/` or `config/` where helpful.
5. Regenerate the inventory: run **`bin/document-skills-and-agents`** from the repo root and **commit** **`docs/skills-and-agents.md`** together with the new skill (CI **`docs_inventory`** job enforces this).

---

## Safety rules

- **No secrets** in output: no API keys, tokens, or contents of `.env`.
- Prefer pointing to **`.env.example`** and README for env var **names**.

---

## Quick reference — template path

Scaffold new skills from:

` .claude/skills/auto-skill-setup/references/skill-template.md `
