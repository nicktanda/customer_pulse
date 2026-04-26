# Discovery Section — Product Plan

> Written: Sat 25 Apr 2026

---

## What Discovery is and why it exists

Right now the product loop runs:

**Learn → Build**

A PM reads an insight in Learn and can immediately jump to Build to create a spec. This is fast, but it skips a crucial step that good product teams always do: **validating and bolstering the insight before committing to building a solution**.

Discovery closes that gap. It is the structured step between understanding a signal (Learn) and committing to building a fix (Build):

**Capture → Analyse → Pulse → Learn → Discover → Build → Ship → Monitor**

Discovery answers the question: *"Before I start writing specs, what else do I need to know — and how do I go get it?"*

The key insight (no pun intended) is that an AI insight from Customer Pulse is a starting point, not a verdict. Discovery gives the PM a structured way to:

1. **Back it up** — find quantitative data that confirms the signal is real
2. **Bolster it** — gather qualitative depth that explains *why* users are experiencing this
3. **De-risk it** — surface assumptions they might be making before they invest in a solution
4. **Size it** — understand how many users are affected, how often, and how severely

Discovery is **linked to a specific insight** — just like specs are. This extends the golden thread:

```
feedback → insight → discovery activities → spec → feature → monitored metric
```

---

## Where Discovery lives in the product

### Option A: Fourth mode (Learn / Discover / Build / Monitor) — Recommended

Discovery becomes its own mode in the mode bar alongside Learn, Build, and Monitor. This is the right choice because:

- Discovery has a distinct user intent: "I'm investigating before I commit"
- It has its own set of tools, pages, and workflows that would clutter Learn
- The mental model is clean — Learn (understand), Discover (validate), Build (create), Monitor (watch)
- It makes the golden thread explicit in the top-level navigation

The mode bar becomes:

```
[ Learn ]  [ Discover ]  [ Build ]  [ Monitor ]
```

### Option B: Sub-section of Learn

Discovery lives at `/app/learn/discovery/`. Simpler to ship but undersells the concept and buries it where most users won't find it. Not recommended.

**Decision: Option A — Discovery as a fourth mode.**

---

## The Discovery activities

Each Discovery activity is a structured task the PM completes (sometimes with AI assistance) to gather evidence related to an insight. Activities are typed — not just free-form notes.

### Activity types

| Type | What it produces | AI role |
|------|-----------------|---------|
| **Interview guide** | A set of interview questions tailored to the insight | AI drafts questions from insight evidence and user type |
| **Survey** | A short targeted survey (3–7 questions) the PM can send to affected users | AI drafts questions; PM edits and exports |
| **Assumption map** | A list of the assumptions being made about the insight and how to test each | AI surfaces implicit assumptions from the insight text |
| **Competitor scan** | Notes on how 2–3 competitors handle the same problem | AI suggests what to look for; PM fills in findings |
| **Data query** | A structured question posed to the reporting/analytics layer to get quantitative backing | Links to the existing Reporting page with a pre-filled question |
| **Desk research** | Free-form notes from secondary research (articles, studies, internal docs) | No AI draft — human-authored |
| **Prototype hypothesis** | A one-sentence hypothesis and a prototype approach to test it | AI drafts from the insight; PM edits before testing |

### Discovery activity states

```
Draft → In Progress → Complete → Archived
```

- **Draft** — created, not yet started
- **In Progress** — PM is actively working on it
- **Complete** — PM has filled in findings
- **Archived** — superseded or no longer relevant

---

## The golden thread — Discovery to Insight to Spec

Every discovery activity is linked to at least one insight. When enough activities are complete, the PM can:

1. Mark the insight as "Discovery complete"
2. Jump to Build with one click — the spec creation form pre-fills a "Discovery summary" from the completed activities

This preserves the golden thread: every spec can show "3 discovery activities backed this up" — interview guide, survey, and competitor scan.

---

## Route structure

```
/app/discover/                        → mode landing (activity feed / dashboard)
/app/discover/insights/               → list of insights that have open discovery
/app/discover/insights/[id]/          → discovery view for a specific insight
/app/discover/insights/[id]/new/      → create a new discovery activity for this insight
/app/discover/activities/[id]/        → individual activity detail + findings editor
```

**Entry points from other modes:**
- Learn → Insight detail page: "Start Discovery" button → `/app/discover/insights/[insight_id]`
- Build → Spec new form: "View discovery" link (if discovery exists for linked insights)

---

## Mode landing page

Follows the `ModeLandingPage` template from design decision #7:

- **Kicker:** VALIDATE BEFORE YOU BUILD
- **Headline:** Know your insight is real before you invest in a solution
- **Body:** Discovery helps you back up an insight with interviews, surveys, data, and research — so when you do start building, you're building the right thing.
- **CTA:** "Start discovering" → `/app/discover/insights/` (or → `/app/learn/insights/` if no insights have been flagged for discovery yet)
- **Steps:**
  1. Pick an insight you want to investigate further
  2. Add discovery activities — interviews, surveys, data queries, competitor scans
  3. Complete the activities and record your findings
  4. When you're confident, create a spec in Build
- **Upcoming cards:** Interview Guide Generator, Survey Builder, Assumption Mapper, Competitor Scan

---

## DB schema

### New tables

#### `discovery_activities`

The core table — one row per activity linked to an insight.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `project_id` | bigint FK → projects | |
| `insight_id` | bigint FK → insights | The insight this activity investigates |
| `activity_type` | integer (enum) | `interview_guide`, `survey`, `assumption_map`, `competitor_scan`, `data_query`, `desk_research`, `prototype_hypothesis` |
| `status` | integer (enum) | `draft`, `in_progress`, `complete`, `archived` |
| `title` | varchar(255) | |
| `ai_generated_content` | jsonb | The AI-drafted questions, assumptions, or hypothesis |
| `findings` | text | PM-authored findings after completing the activity |
| `ai_generated` | boolean | True if content was AI-drafted |
| `created_by` | bigint FK → users | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `DiscoveryActivityType` enum

```ts
interview_guide = 1
survey          = 2
assumption_map  = 3
competitor_scan = 4
data_query      = 5
desk_research   = 6
prototype_hypothesis = 7
```

#### `DiscoveryActivityStatus` enum

```ts
draft       = 1
in_progress = 2
complete    = 3
archived    = 4
```

### No changes to existing tables needed for Phase 1

The `spec_insights` join already links specs to insights. In Phase 2+ we can add a `spec_discovery_activities` join table to surface the discovery evidence on spec detail pages.

---

## UI/UX design

### Discovery insight view (`/app/discover/insights/[id]/`)

This is the main working page. Layout:

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to insights                                      │
│                                                          │
│  [Insight title]                          [Create spec →]│
│  [Insight summary in a muted card]                       │
│                                                          │
│  Discovery activities          [+ Add activity ▾]        │
│  ─────────────────────────────────────────────────────   │
│  ○ Interview guide        Draft      [Edit] [Complete]   │
│  ✓ Competitor scan        Complete   [View findings]     │
│  ○ Survey                 In progress [Edit]             │
│                                                          │
│  Findings summary (AI-generated from completed activities)│
│  ──────────────────────────────────────────────────────  │
│  "Based on 2 completed activities: users are frustrated  │
│   by X because Y. Competitor Z handles it by..."        │
│                                     [AI drafted badge]   │
└─────────────────────────────────────────────────────────┘
```

- The **"Create spec →"** button is always visible but has a state:
  - If 0 activities: "Create spec (no discovery yet)"
  - If 1+ draft/in-progress: "Create spec (discovery in progress)"
  - If 1+ complete: "Create spec (discovery complete ✓)" — primary colour emphasis
- The **AI findings summary** regenerates when a new activity is marked complete

### Activity detail (`/app/discover/activities/[id]/`)

Split-panel layout:

- **Left:** AI-drafted content (questions, assumptions, hypothesis) — read-only with an "AI drafted" badge
- **Right:** PM's findings editor — rich text / markdown, saved automatically
- **Bottom:** Status picker + "Mark complete" primary button

### "Start Discovery" button on Insight detail (Learn mode)

The insight detail page (`/app/learn/insights/[id]/page.tsx`) gets a secondary CTA alongside the existing "Create spec" button:

```
[Create spec →]   [Start Discovery]
```

"Start Discovery" links to `/app/discover/insights/[id]` (creating the discovery record if it doesn't exist yet).

---

## Build phases

### Phase 1 — Mode shell + route structure (~45 mins)

**Goal:** Discovery appears in the mode bar and has a landing page. No real functionality yet.

- [ ] Add "Discover" tab to `ModeBar.tsx` between Learn and Build
- [ ] Create `/app/app/discover/` route group
- [ ] Create `/app/app/discover/page.tsx` — `ModeLandingPage` with coming-soon content
- [ ] Add "Discover" group to sidebar nav in `layout.tsx` (single link for now: "Activities")
- [ ] Add `/app/discover` → comes before `/app/build` in sidebar ordering

**Files:**
- `apps/web/src/components/ModeBar.tsx`
- `apps/web/src/app/app/discover/page.tsx` (new)
- `apps/web/src/app/app/layout.tsx`

---

### Phase 2 — DB schema (~30 mins)

**Goal:** `discovery_activities` table exists and has Drizzle types.

- [ ] Add `DiscoveryActivityType` and `DiscoveryActivityStatus` enums to `packages/db/src/enums.ts`
- [ ] Add `discoveryActivities` table to `packages/db/src/schema.ts`
- [ ] Run `yarn db:generate:tenant` and apply migration
- [ ] Add query helpers: `getDiscoveryActivitiesByInsight`, `createDiscoveryActivity`, `updateDiscoveryActivity`
- [ ] Export from `packages/db/package.json`

**Files:**
- `packages/db/src/schema.ts`
- `packages/db/src/enums.ts`
- `packages/db/src/queries/discovery.ts` (new)
- `packages/db/drizzle/000X_discovery_activities.sql` (generated)

---

### Phase 3 — Insight discovery view + activity list (~1 hour)

**Goal:** A PM can navigate to `/app/discover/insights/[id]` and see an insight's discovery activities.

- [ ] Create `/app/discover/insights/page.tsx` — list of insights that have open discovery (or a prompt to start)
- [ ] Create `/app/discover/insights/[id]/page.tsx` — activity list for a single insight (server component)
- [ ] Create activity row component with status pill, type icon, and edit/complete actions
- [ ] "Add activity" dropdown with all 7 activity types
- [ ] Empty state: "No activities yet. Add an interview guide, survey, or competitor scan to start validating this insight."

**Files:**
- `apps/web/src/app/app/discover/insights/page.tsx` (new)
- `apps/web/src/app/app/discover/insights/[id]/page.tsx` (new)
- `apps/web/src/components/discovery/ActivityRow.tsx` (new)

---

### Phase 4 — Activity detail + findings editor (~1 hour)

**Goal:** A PM can open an activity, see AI-drafted content, and write their findings.

- [ ] Create `/app/discover/activities/[id]/page.tsx` — split-panel layout (AI content left, findings right)
- [ ] Add `updateActivityFindings` server action
- [ ] Add `markActivityComplete` server action
- [ ] Auto-save findings with a 2-second debounce (client component)

**Files:**
- `apps/web/src/app/app/discover/activities/[id]/page.tsx` (new)
- `apps/web/src/app/app/discover/actions.ts` (new)

---

### Phase 5 — AI activity drafting (~45 mins)

**Goal:** Claude reads the insight and generates the starting content for each activity type.

- [ ] Add `draftDiscoveryActivity` server action — calls Claude with insight evidence + activity type
- [ ] Claude prompts per type:
  - **Interview guide:** "Given this insight, generate 6 open-ended interview questions that would help validate whether this problem is real, widespread, and worth solving."
  - **Survey:** "Generate a 5-question survey to send to affected users. Avoid leading questions."
  - **Assumption map:** "List the 4–6 assumptions being made in this insight. For each, suggest one way to test or disprove it."
  - **Competitor scan:** "Suggest 3 competitors to research and 3 specific things to look for about how they handle this problem."
  - **Prototype hypothesis:** "Write a one-sentence testable hypothesis for this insight in the format: 'We believe [solution] will [outcome] for [user type].'"
- [ ] Show "AI drafted" badge on all AI-generated content
- [ ] "Regenerate" button to re-run the draft

**Files:**
- `apps/web/src/app/app/discover/actions.ts` (extend)

---

### Phase 6 — "Start Discovery" CTA on Insight detail (~30 mins)

**Goal:** The golden thread flows from Learn → Discover — one button click from an insight to its discovery workspace.

- [ ] Add "Start Discovery" secondary button to insight detail page (`/app/learn/insights/[id]/page.tsx`)
- [ ] Button links to `/app/discover/insights/[id]`
- [ ] If activities already exist for this insight, show a count badge: "Discovery (3 activities)"
- [ ] Add discovery activity count to insight list cards as a small indicator

**Files:**
- `apps/web/src/app/app/learn/insights/[id]/page.tsx`
- `apps/web/src/app/app/learn/insights/page.tsx`

---

### Phase 7 — AI findings summary (~30 mins)

**Goal:** When 1+ activities are complete, an AI summary of all findings appears on the insight discovery view.

- [ ] Add `generateDiscoverySummary` server action — fetches all complete activity findings, calls Claude to synthesise them
- [ ] Renders as a highlighted card above the activity list with an "AI drafted" badge
- [ ] Regenerates when a new activity is marked complete (use `revalidatePath`)
- [ ] Summary is stored in a new `discovery_summary` column on the insight row (nullable) — avoids re-running Claude on every page load

**Files:**
- `apps/web/src/app/app/discover/actions.ts`
- `packages/db/src/schema.ts` (add `discovery_summary` to insights)

---

## Integration with Build

Once Discovery is live, the spec creation flow gains awareness of it:

1. From `/app/discover/insights/[id]/`, the "Create spec" button passes `from_insight=[id]` AND `from_discovery=true` to `/app/build/specs/new`
2. The new spec form shows a "Discovery findings" collapsible section, pulling in the AI summary
3. Claude's spec drafting prompt (Phase 5 of the build plan) is augmented with discovery findings when available
4. Spec list cards and spec detail pages show a "Discovery backed" indicator when spec has linked discovery

---

## Open questions to decide before building

| # | Question | Options |
|---|----------|---------|
| 1 | Should Discovery be a mode (4th tab) or a sub-section of Learn? | Mode recommended — see reasoning above |
| 2 | Are activity findings stored as markdown or structured fields? | Markdown for flexibility (can always structure later) |
| 3 | Should surveys be shareable links (like Typeform)? | Out of scope for now — record findings manually |
| 4 | Should the AI findings summary regenerate automatically, or on-demand? | On-demand with a "Regenerate" button — auto is noisy |
| 5 | How many activity types should ship in v1? | All 7 types with basic drafting — can add depth later |

---

## Effort estimate

| Phase | Est | Notes |
|-------|-----|-------|
| 1 — Mode shell | 45 min | Simple — follows ModeBar + ModeLandingPage pattern |
| 2 — DB schema | 30 min | One new table, two enums |
| 3 — Insight discovery view | 1 hr | Server component list + activity rows |
| 4 — Activity detail + findings | 1 hr | Split panel + server actions |
| 5 — AI drafting | 45 min | 5 Claude prompts, one per activity type |
| 6 — Insight CTA | 30 min | Button + count badge |
| 7 — AI findings summary | 30 min | Synthesis prompt + storage |
| **Total** | **~5 hrs** | Across 1–2 sessions |

---

## Summary — what Discovery adds to the product

Without Discovery, the golden thread is:

> feedback → insight → spec

With Discovery, it becomes:

> feedback → insight → **discovery activities → validated findings** → spec

This is the difference between building what the data suggests and building what has been properly validated. It makes Customer Pulse not just an analysis tool but a full product development workflow — from raw customer signal all the way to a confidence-backed spec, with a complete audit trail showing exactly why a feature was built.
