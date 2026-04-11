---
name: Demo data button
overview: Add an opt-in, admin-only server action that seeds the **current project** with tagged demo rows (feedback, pulse reports, recipients, strategy text, themes/insights, sample reporting jobs, optional disabled integrations), with idempotent cleanup of prior demo data. Gate the UI with an explicit env flag so production stays safe by default.
todos:
  - id: env-gate
    content: Add ALLOW_DEMO_DATA_SEED to .env.example + apps/web/.env.example with comment
    status: completed
  - id: seed-module
    content: Implement demo-project-seed.ts (remove + insert in transaction, markers)
    status: completed
  - id: server-action
    content: Add loadDemoDataAction with auth, env, userCanEditProject, revalidatePath
    status: completed
  - id: settings-ui
    content: Add Settings card + form + success notice for demo load
    status: completed
  - id: manual-qa
    content: Verify dashboard, feedback, reporting, pulse, strategy, recipients, integrations
    status: completed
isProject: false
---

# Demo data button for Customer Pulse

## Goal

A **Demo data** control that fills the **currently selected project** (sidebar project cookie) with realistic-looking Postgres rows so Dashboard, Feedback, Reporting, Pulse reports, Strategy, Email recipients, and Integrations look populated—without touching other projects or real integrations.

## Why not “prefill forms” only

The UI reads from the database ([`apps/web/src/app/app/page.tsx`](apps/web/src/app/app/page.tsx), [`apps/web/src/app/app/feedback/page.tsx`](apps/web/src/app/app/feedback/page.tsx), etc.). Client-side form prefills would not populate charts, lists, or detail pages. The right approach is a **server action** that inserts/deletes rows via Drizzle ([`packages/db/src/schema.ts`](packages/db/src/schema.ts)).

## Security and gating (required)

- **Never** expose unconditional seeding in production.
- Recommended gate: **`ALLOW_DEMO_DATA_SEED=true`** in [`.env.example`](.env.example) / [`apps/web/.env.example`](apps/web/.env.example) (documented, default off). The button and action return 404 / no-op unless this is set (and optionally still require **`NODE_ENV === "development"`** if you want double lock—your call; the plan uses **env flag only** so a staging URL can demo with the flag).
- **Authorization**: only users who can edit the project ([`userCanEditProject`](apps/web/src/lib/project-access.ts)), typically **admin** in this app. Viewers must not seed.

## Idempotency / cleanup

So repeated clicks do not duplicate clutter, **remove prior demo rows for this `projectId` first**, using a consistent marker:

| Entity | Marker |
|--------|--------|
| `feedbacks` | `raw_data` JSON includes `_cpDemo: true` (boolean) |
| `themes` / `insights` | `metadata._cpDemo === true` |
| `teams` | Fixed name prefix e.g. `Demo: …` |
| `pulse_reports` | Magic first line in `summary` (e.g. `<!--cp-demo-->\n`) or same in `summary` prefix |
| `email_recipients` | Fixed demo email(s) e.g. `pulse-demo@example.com` |
| `reporting_requests` | `prompt` starts with `[demo]` |
| `integrations` | `name` starts with `Demo:` and `enabled = false`, `credentials_ciphertext` null |

**Delete order** (respect FKs if your DB enforces them): `feedback_insights` (where feedback is demo) → demo `feedbacks` → `insight_themes` for demo insights → demo `insights` → demo `themes` → demo `reporting_requests` → demo `pulse_reports` → demo `email_recipients` → demo `integrations` → demo `teams`. Then re-insert in the opposite order inside a **`db.transaction()`**.

If any FK is missing in DB, adjust order after a quick `information_schema` check during implementation.

## What to seed (minimal “looks real” set)

1. **Feedbacks** (~15–20): mix of [`FeedbackSource`](packages/db/src/enums.ts), category, priority, status; spread `created_at` over the last ~30 days; some with `ai_summary` / `ai_processed_at`, some without (dashboard “Unprocessed” stays interesting). Use unique `source_external_id` values like `cp_demo_<uuid>` to satisfy the unique index on `(source, source_external_id)`.

2. **Pulse reports** (2–3): `period_start` / `period_end`, `sent_at`, `feedback_count`, `recipient_count`, plausible `summary` (with demo marker).

3. **Email recipients** (1–2): demo addresses + names.

4. **Strategy** ([`projects`](packages/db/src/schema.ts) + [`teams`](packages/db/src/schema.ts)): set `business_objectives` / `business_strategy` on the project; insert 2 `teams` rows with objectives/strategy (`Demo: …` names).

5. **Reporting** ([`themes`](packages/db/src/schema.ts), [`insights`](packages/db/src/schema.ts)): a few themes and insights with `created_at` inside the last 30 days so [`apps/web/src/app/app/reporting/page.tsx`](apps/web/src/app/app/reporting/page.tsx) sections are non-empty. Optionally 1–2 [`reporting_requests`](packages/db/src/schema.ts) with `status = done` and short `result_markdown`.

6. **Integrations** (optional but nice): a few rows, **`enabled: false`**, **`credentials_ciphertext: null`**, names like `Demo: Linear`—list UI already handles enabled/disabled ([`apps/web/src/app/app/integrations/page.tsx`](apps/web/src/app/app/integrations/page.tsx)).

## Code layout

- **[`apps/web/src/lib/demo-project-seed.ts`](apps/web/src/lib/demo-project-seed.ts)** (new): `seedDemoDataForProject(db, projectId)` and `removeDemoDataForProject(db, projectId)` — pure DB logic, heavily commented for learning.
- **[`apps/web/src/app/app/settings/demo-seed-actions.ts`](apps/web/src/app/app/settings/demo-seed-actions.ts)** (new): `"use server"` action `loadDemoDataAction()` — checks env flag, session, `userCanEditProject`, resolves `getCurrentProjectIdForUser`, calls seed, `revalidatePath` for `/app`, `/app/feedback`, `/app/reporting`, `/app/pulse-reports`, `/app/strategy`, `/app/recipients`, `/app/integrations`, redirects back to Settings with `?notice=demo`.

- **[`apps/web/src/app/app/settings/page.tsx`](apps/web/src/app/app/settings/page.tsx)**: new card section “Developer / demo” visible only when `process.env.ALLOW_DEMO_DATA_SEED === "true"` **and** `canEdit`, with a form posting to the action, short warning that data is synthetic and removable by clicking again (because of cleanup).

## UX notes

- **Onboarding**: users without `onboarding_completed_at` never reach Settings. If you want demo **before** onboarding, that would be a **second** button on [`apps/web/src/app/app/onboarding/page.tsx`](apps/web/src/app/app/onboarding/page.tsx) that creates a project, sets the cookie, marks onboarding complete, then seeds—**not** in the initial scope unless you want it; call out as follow-up.
- After implementation: **refresh the app** (your dev server is already running).

## Tests (lightweight)

- Unit test the marker helpers or seed function with mocked DB is awkward; optional **integration** test skipped unless you already have a Postgres test harness for web. Manual QA checklist in PR is enough for v1.

## Docs

- Add **`ALLOW_DEMO_DATA_SEED`** to env examples only (no new README sections unless you want a one-liner)—per your preference to avoid extra markdown unless asked; minimal `.env.example` line + comment is appropriate for discoverability.
