# Build Plan — Saturday 25 April 2026

**Goal for today:** Foundation day. By end of session: the mode bar is live, the `specs` table exists, and a PM can create a spec directly from an insight in one click — with AI-drafted user stories.

**Ships today:** Learn / Build / Monitor navigation shell + the end-to-end flow from Insight → AI-drafted Spec. The loop from customer feedback to build intent is complete, even if the Kanban board and Monitor area come tomorrow.

---

## Stats

| | |
|--|--|
| Phases | 5 |
| Estimated total | ~4 hours |
| Tasks | 27 |
| Files changed | ~11 |

---

## Phase 1 — Mode bar + route structure (~1 hour) ✅ DONE

**Goal:** The app shell gains a Learn / Build / Monitor mode switcher. Existing routes still work via redirects.

### Tasks

- [x] `n1` Create ModeBar component in `apps/web/src/components/ModeBar.tsx` — three tabs (Learn, Build, Monitor) with active state based on current pathname
- [x] `n2` Add ModeBar to `apps/web/src/app/app/layout.tsx`, below the project header
- [x] `n3` Create `apps/web/src/app/app/learn/` route group — move insights, feedback pages in as sub-routes (themes/ideas pages don't exist yet — skipped)
- [x] `n4` Add 301 redirects: `/app/insights` → `/app/learn/insights`, `/app/feedback` → `/app/learn/feedback` (also `/app/themes` and `/app/ideas` added preemptively)
- [x] `n5` Create `apps/web/src/app/app/build/` route group with a skeleton page and empty state pointing back to Learn
- [x] `n6` Create `apps/web/src/app/app/monitor/` route group with a skeleton page and empty state pointing to Build
- [x] `n7` Update sidebar nav links to use new `/app/learn/...` paths; keep existing link text unchanged

### Files touched

- `apps/web/src/components/ModeBar.tsx` — updated Learn tab `href` to `/app/learn/insights`; `activeWhen` now matches `/app/learn/*` plus reporting, strategy, pulse-reports, dashboard
- `apps/web/src/app/app/layout.tsx` — sidebar Feedback/Insights hrefs updated to `/app/learn/...`
- `apps/web/src/app/app/learn/page.tsx` *(new)* — redirects `/app/learn/` to `/app/learn/insights` (prevents 404 on bare mode URL)
- `apps/web/src/app/app/learn/insights/page.tsx` *(new — moved from `app/insights/`)* — internal hrefs updated
- `apps/web/src/app/app/learn/insights/[id]/page.tsx` *(new — moved)* — back link and redirect updated
- `apps/web/src/app/app/learn/feedback/page.tsx` *(new — moved from `app/feedback/`)* — "Clear all" href updated
- `apps/web/src/app/app/learn/feedback/[id]/page.tsx` *(new — moved)* — back link, redirect, prev/next nav updated
- `apps/web/src/app/app/learn/feedback/actions.ts` *(new — moved)* — all `redirect()`, `revalidatePath()`, and `parseSafeListReturnPath` validator updated to `/app/learn/feedback`
- `apps/web/src/app/app/build/page.tsx` — CTA href updated to `/app/learn/insights`; unused `Link` import removed
- `apps/web/src/app/app/build/specs/page.tsx` — empty state Insights links updated to `/app/learn/insights`
- `apps/web/src/middleware.ts` — added `LEARN_REDIRECTS` table: 301s for insights, feedback, themes, ideas (old path → `/app/learn/…`)
- `apps/web/src/lib/insights-list-query.ts` — base path updated to `/app/learn/insights`
- `apps/web/src/lib/feedback-list-query.ts` — base path updated to `/app/learn/feedback`
- `apps/web/src/app/app/settings/demo-seed-actions.ts` — `revalidatePath` calls updated
- `apps/web/src/app/app/page.tsx` — two AI-queue links updated to `/app/learn/feedback`

### Notes & deviations from plan

- `ModeBar.tsx` and both mode landing pages (`build/page.tsx`, `monitor/page.tsx`) already existed from a prior session — only the paths/hrefs inside them needed updating.
- Old `apps/web/src/app/app/insights/` and `apps/web/src/app/app/feedback/` directories were deleted after the new files were created; middleware 301s cover any remaining bookmarks.
- `themes/` and `ideas/` sub-routes skipped — those pages don't exist in the codebase yet. Middleware redirects for both were registered preemptively so they'll work when the pages are built.
- `SidebarNav.tsx` `NAV_ICONS` map already had the new paths from a prior session — no changes needed there.

---

## Phase 2 — Specs DB schema (~30 mins) ✅ DONE

**Goal:** Add the `specs` table to Drizzle — the core primitive that everything in Build depends on.

### Tasks

- [x] `s1` Add `specs` table to `packages/db/src/schema.ts` — columns: `id`, `project_id`, `title`, `user_stories`, `acceptance_criteria`, `status` (enum), `effort_score`, `impact_score`, `created_by`, `created_at`, `updated_at`
- [x] `s2` Add `spec_insights` join table — `spec_id`, `insight_id` (the golden thread link)
- [x] `s3` Add `SpecStatus` enum to `packages/db/src/enums.ts` — `backlog`, `drafting`, `review`, `ready`, `in_progress`, `shipped`
- [x] `s4` Generate Drizzle migration — `0002_romantic_lethal_legion.sql` created (specs + spec_insights tables)
- [x] `s5` Applied to DB via `ensure_skills.sql` + `ensure_specs.sql` (see migration status note below)

### Files touched

- `packages/db/src/schema.ts`
- `packages/db/src/enums.ts`
- `packages/db/drizzle/0002_romantic_lethal_legion.sql` *(new migration file)*

---

## 🗄️ Migration status — ✅ ALL APPLIED

> **For the next agent:** all tables are live. `drizzle-kit check` confirms zero schema drift. `yarn db:migrate` is safe for future migrations.

### What exists on disk (schema.ts) vs what's in the DB

| Table | Column | In schema.ts | In migration file | Applied to DB |
|-------|--------|:---:|:---:|:---:|
| `specs` | `id`, `project_id`, `title`, `user_stories`, `acceptance_criteria`, `status`, `effort_score`, `impact_score`, `ai_generated`, `created_by`, `created_at`, `updated_at` | ✅ | ✅ `0002` | ✅ applied |
| `specs` | `description` | ✅ | ❌ not in `0002` | ✅ applied via `ensure_specs.sql` |
| `spec_insights` | `id`, `spec_id`, `insight_id`, `created_at`, `updated_at` | ✅ | ✅ `0002` | ✅ applied |
| `skills` | all columns | ✅ | ❌ no migration file existed | ✅ applied via `ensure_skills.sql` |

### How it was applied

The DB was in a pre-Drizzle state (Rails-era schema), so `yarn db:migrate` would have crashed — `__drizzle_migrations` was empty and all three `.sql` files would have re-run against already-existing tables.

Two idempotent `ensure_*.sql` files were written and applied via `psql` instead:

```bash
psql $DATABASE_URL -f packages/db/sql/ensure_skills.sql
psql $DATABASE_URL -f packages/db/sql/ensure_specs.sql  # includes description column
```

All three migration hashes were then inserted into `drizzle.__drizzle_migrations` so that `yarn db:migrate` is now safe for any future migrations. `drizzle-kit check` confirms zero schema drift.

### How to verify it worked

Connect to the local database and run:

```sql
-- Both tables should exist
\dt specs
\dt spec_insights

-- specs should have all these columns including description
\d specs

-- Expected output includes:
--   id              | bigint
--   project_id      | bigint
--   title           | character varying(255)
--   description     | text                        ← added in Phase 3
--   user_stories    | jsonb
--   acceptance_criteria | jsonb
--   status          | integer
--   effort_score    | double precision
--   impact_score    | double precision
--   ai_generated    | boolean
--   created_by      | bigint
--   created_at      | timestamp with time zone
--   updated_at      | timestamp with time zone
```

### Drizzle config reference

Both scripts are defined in the **root `package.json`** (not `packages/db/package.json`):

| Root script | What it does |
|-------------|-------------|
| `yarn db:generate:tenant` | Runs `drizzle-kit generate` against `packages/db/src/schema.ts`, outputs to `packages/db/drizzle/` |
| `yarn db:migrate` | Runs `drizzle-kit migrate` against the same config, applies all unapplied migration files |

Drizzle config: `packages/db/drizzle.config.ts`
- Schema source: `./src/schema.ts`
- Migration output dir: `./drizzle/`
- DB URL: `process.env.DATABASE_URL` (falls back to `postgres://localhost:5432/customer_pulse_development` if not set)
- The `db:migrate` root script passes `--env-file=../../.env` so it reads from the repo-root `.env`, not `.env.local`

---

## Phase 3 — Spec list page + create form (~1 hour) ✅ DONE

**Goal:** A PM can navigate to `/app/build/specs`, see their project's specs, and create a new one manually.

### Tasks

- [x] `l1` Create `/app/build/specs/page.tsx` — server component that fetches specs for the current project and renders a list (title, status pill, insight count, created date)
- [x] `l2` Add empty state to spec list: "No specs yet. Go to Learn → Insights and click Create spec on any insight."
- [x] `l3` Create `/app/build/specs/new/page.tsx` — form with title, description, and a multi-select of existing insights to link
- [x] `l4` Create `createSpecAction` server action in `apps/web/src/app/app/build/actions.ts` — inserts spec row + `spec_insights` join rows
- [x] `l5` Add Drizzle query helpers in `packages/db/src/` — `getSpecsByProject`, `createSpec`, `linkSpecToInsights`
- [x] `l6` Add "New spec" button to spec list header, linking to `/app/build/specs/new`

### Files touched

- `apps/web/src/app/app/build/specs/page.tsx` *(new)*
- `apps/web/src/app/app/build/specs/new/page.tsx` *(new)*
- `apps/web/src/app/app/build/actions.ts` *(new)*
- `packages/db/src/queries/specs.ts` *(new)*
- `packages/db/src/queries/` *(new directory)*
- `packages/db/package.json` — added `./queries/specs` export
- `apps/web/src/app/app/layout.tsx` — sidebar now points to `/app/build/specs`; removed stale `icon` props from `SidebarNavItem` objects (SidebarNav resolves icons by href via `NAV_ICONS`)
- `apps/web/src/components/SidebarNav.tsx` — added `/app/build/specs` to `NAV_ICONS` *(was already added in Phase 1)*
- `apps/web/src/components/feedback/FeedbackDetailBody.tsx` — fixed stale import path (`feedback/actions` → `learn/feedback/actions`)

### Notes & deviations from plan

- `specs` table was already in the schema from Phase 2, but was **missing the `description` column** needed by the new spec form. Added it as `text("description")` (nullable).
- `spec_insights` table already had `updatedAt` from Phase 2 — query helper was updated to include it in inserts.
- Query helpers live in `packages/db/src/queries/specs.ts` (a new `queries/` subdirectory) and are exported via the package's `exports` map — callers use `@customer-pulse/db/queries/specs`.
- `insight_count` on the list page uses a correlated subquery rather than a JOIN + GROUP BY to keep the query simple.
- The new spec form already wires up the Phase 4 `?from_insight=<id>` param (pre-selects the insight, pre-fills the title) so Phase 4 only needs the CTA button on the insight detail page.

### ⚠️ Action required before this works in the browser

The `specs` and `spec_insights` tables exist in the Drizzle schema and `0002_romantic_lethal_legion.sql` was generated in Phase 2, but the migration **has not been applied to the database yet** (Phase 2 task `s5` still pending). In addition, the `description` column added in Phase 3 needs its own new migration. Until both are applied, any page that queries these tables will throw a Postgres "relation does not exist" error.

Run in this order:

```bash
yarn db:generate   # generates a new migration for the description column
yarn db:migrate    # applies 0002 + the new migration together
```

---

## Phase 4 — "Create spec" CTA on insight detail (~45 mins)

**Goal:** The golden thread in action — one click from an insight in Learn to a pre-filled spec in Build.

### Tasks

- [ ] `c1` Add a prominent "Create spec" button to the insight detail page (`/app/learn/insights/[id]`)
- [ ] `c2` Button links to `/app/build/specs/new?from_insight=[id]` — passing the insight ID in the query string
- [ ] `c3` New spec form reads the `from_insight` param and pre-selects that insight in the linked insights multi-select
- [ ] `c4` Pre-fill spec title with the insight title as a starting point
- [ ] `c5` After spec is created, show a success toast and redirect to `/app/build/specs/[newId]`

### Files touched

- `apps/web/src/app/app/learn/insights/[id]/page.tsx`
- `apps/web/src/app/app/build/specs/new/page.tsx`

---

## Phase 5 — AI spec drafting (~45 mins)

**Goal:** Claude reads the linked insight's evidence and generates user stories + acceptance criteria into the spec form.

### Tasks

- [ ] `a1` Add a "Draft with AI" button to the new spec form — active only when at least one insight is linked
- [ ] `a2` Create `draftSpecWithAI` server action — fetches linked insight evidence, calls Claude (existing `callClaudeJson` helper), returns `user_stories` and `acceptance_criteria` as JSON
- [ ] `a3` Claude prompt: given insight type, severity, evidence, and linked feedback summaries, produce 3–5 user stories and acceptance criteria for each
- [ ] `a4` Populate the spec form fields with the AI response — user can edit before saving
- [ ] `a5` Show an "AI drafted" badge on the spec after save if it was AI-generated

### Files touched

- `apps/web/src/app/app/build/actions.ts`
- `apps/web/src/app/app/build/specs/new/page.tsx`

---

## Dependency chain

| Phase | Depends on | Unlocks |
|-------|-----------|---------|
| 1 — Mode bar | Nothing (pure UI) | Route structure for phases 3–5 |
| 2 — DB schema | Nothing (pure DB) | All Build UI (phases 3–5) |
| 3 — Spec list + create | Phases 1 + 2 | Phase 4 CTA target, Phase 5 AI action |
| 4 — Insight CTA | Phase 3 (the /new page must exist) | The golden thread — Learn → Build |
| 5 — AI drafting | Phase 3 + insight data in DB | PRD Builder, Spec Board (Day 2) |

---

## Out of scope today

These are explicitly deferred. Having a written list stops scope creep mid-session.

| Feature | Area | When |
|---------|------|------|
| Spec Board (Kanban) | Build | Needs specs to exist first — Day 2 |
| Spec detail page | Build | Basic CRUD — Day 2, 30 mins |
| Effort/Impact Planner | Build | Day 2 — reads existing idea scores |
| PRD Builder | Build | Day 3+ — higher complexity |
| GitHub Issue Sync | Build | Day 3 — extends existing PR job |
| Session Replay Linking | Monitor | Day 2 — extend LogRocket sync job |
| Error → Feedback Pipeline | Monitor | Day 2 — reuses ingest pipeline |
| Release Health Dashboard | Monitor | Day 3+ — needs specs + LogRocket |
| Dashboard mode panels | Shell | Day 2 — add Learn/Build/Monitor summary |
| Mode bar badge counts | Shell | Day 2 — static placeholders today |

---

## Design rules to follow while coding

### Golden thread first
Every spec row must store which insight(s) it came from (`spec_insights` join table). Don't allow a spec to be created without prompting for insight links — even if the field is optional.

### Empty states point forward
Build's empty state points to Learn. Monitor's points to Build. Write the empty state copy before the data-populated view — it forces clarity on what the page is for.

### Mode bar is always visible
The mode bar renders on every `/app/...` page, including the current insights and feedback pages. Don't hide it for "not yet built" modes — show them as coming soon or disabled.

### Redirects before anything else
Set up `/app/insights` → `/app/learn/insights` redirect in Phase 1, before touching any page components. This way nothing breaks during the refactor.

### AI badge on AI-drafted content
Any spec field generated by Claude gets an "AI drafted" indicator so PMs know to review it. Store `ai_generated: boolean` on the spec row.

---

## Day 2 preview (Sunday 26 April)

Once today's foundation is solid, Day 2 focuses on making Build useful to look at, and opening the Monitor area with the two easiest LogRocket integrations.

| Priority | Task | Est |
|----------|------|-----|
| 1 | Spec detail page — view and edit a spec | 30 mins |
| 2 | Spec Board — Kanban columns, drag between statuses | 1.5 hours |
| 3 | Mode bar badge counts — live data queries | 30 mins |
| 4 | Dashboard mode panels — 3-panel cross-mode summary | 1 hour |
| 5 | Session Replay Linking — add `session_replay_url` to LogRocket sync | 45 mins |
| 6 | Error → Feedback Pipeline — LogRocket errors auto-create feedback | 1 hour |

---

*Customer Pulse — roadmap generated Sat 25 Apr 2026*
