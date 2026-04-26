# Discovery area — build stages

This document breaks the “ideal” Discover experience into **ordered stages**. Each stage is shippable on its own; avoid starting a stage until its **dependencies** are met (or consciously stub them).

**Status legend (edit as you go):** `Not started` · `In progress` · `Shipped`

---

## Stage 0 — Baseline (reference)

**Status:** `Shipped` (as of roadmap authoring)

**Goal:** Single PM can validate an insight with typed discovery activities and see work on a status board.

**What exists**

- `discovery_activities` linked to `insights` and `project_id`; AI drafts and findings on the activity detail page.
- Discover home (insight + tools), per-insight activity list, project board by status.

**Why list it:** Later stages assume this data model and these URLs; agents should not regress core flows.

---

## Stage 1 — Information architecture & entry clarity

**Status:** `Shipped` — **Shipped in:** 2026-04-26 (hub + routes + sidebar hierarchy; follow-up same day: **all** main sidebar section headings use the same expand/collapse behaviour; later same day: **Discover hub landing v2** — see bullets below).

**Goal:** One clear mental model for “Discover” — users understand **where to go** for overview vs deep work without two vague sibling nav items.

**Description**

Today, **Board** and **Activities** can both sound like “lists of work.” This stage refines **labels and structure** so:

- The sidebar reflects a **hierarchy**: e.g. a single **Discover** entry that opens a **hub**, or two items with **distinct names** (e.g. “Board” vs “Insight workspace” / “Tools”).
- The hub explains the three ideas: **see all discovery** (board/map), **work on one insight** (workspace), **insights already in discovery** (list).

**Scope (typical deliverables)** — *done in v1 pass*

- [x] Updated copy on Discover routes (`PageHeader`, helper paragraphs).
- [x] Sidebar / layout: `NavGroupSection` in `apps/web/src/components/SidebarNav.tsx` — **Learn, Discover, Build, Monitor, and Workspace** each use the same title-as-toggle pattern (sub-links for the *current* area auto-open; `pathnameInGroupArea` + `isPathInNavSubtree` for route matching, including the Discover hub and all paths under `/app/discover/…`). **Discover** sub-links: **Overview**, **OST Map**, **My discovery**, **Board**, **Workspace**, **Insights** — see [`apps/web/src/app/app/layout.tsx`](../../../apps/web/src/app/app/layout.tsx) (`sidebarNavGroups`). Active highlighting is **path-based** (no hash routing for the map).
- [x] `/app/discover` is a **hub** (landing): **At a glance** (totals, OST opportunity count, queue/column **links to board**), **Who’s doing what** (active work by effective owner; **full-width** copy when the only bucket is *Unassigned*), **Recently updated**, then an **embedded OST Map** preview (same canvas as the full map page — `DiscoverOstMapPanel` in `DiscoverHubContent`). The hub **no longer** includes a duplicate “Go to” link strip; the **sidebar** is the canonical list of discover destinations. **Legacy:** `?insight=` / `?note=` on `/app/discover` still redirect to `workspace`, as before. **Data helpers for the hub** (in `packages/db` / `apps/web`): `getDiscoveryActivityStatusCounts`, `listDiscoveryActivitiesForBoard` (options e.g. `limit`, `excludeArchived`), and `buildWhosDoingWhatGroups` in `apps/web/src/lib/discovery-whos-doing-what.ts`.
- [x] Tools for one insight live at `/app/discover/workspace` (legacy `?insight=` from hub still supported via redirect as above).

**Dependencies:** Stage 0.

**Success criteria**

- New users (or test teammates) can answer: “Where do I see everything?” vs “Where do I use the tools on one insight?” without trial-and-error.
- No broken deep links; existing bookmarks to `/app/discover`, `/app/discover/board`, etc. still work.

**Out of scope**

- New database columns, OST nodes, assignments.

---

## Stage 2 — “My discovery” personal queue

**Status:** `Shipped` — **Shipped in:** 2026-04-26 (`/app/discover/me`, `created_by` filter, sections + hints).

**Goal:** Each logged-in user sees **their** open discovery work: what to open next, what stage it’s in, and what’s **incomplete**.

**Description**

Teams scale when individuals don’t have to hunt the full board. This stage adds a **personal view** that aggregates activities (and optionally parent insights) relevant to the current user.

**Initial implementation options (pick one for v1)**

- **Filter-only:** “My work” = activities where `created_by = current user` (no schema change; limited but fast).
- **Assignee-based:** Requires Stage 3’s `assignee` (or equivalent) — preferred long-term.

**Scope (typical deliverables)** — *done in v1 pass*

- [x] Route **`/app/discover/me`** + link from Discover hub + Discover sidebar (`listMyDiscoveryActivitiesForUser` in `packages/db/src/queries/discovery.ts`).
- [x] Initial query used **`created_by` = current user** (no schema). **Stage 3** widened “my work” to assignee, insight discovery lead, and created-by fallback — see Stage 3.
- [x] UI sections: **Draft**, **In progress**, **Complete**, **Archived** (only sections with rows are shown).
- [x] **Completeness hints** (rule-based): `myDiscoveryActivityHints` in `apps/web/src/lib/discovery-my-queue-hints.ts` — e.g. no AI draft (except desk research type 6), no findings, complete without written findings.

**Dependencies:** Stage 1 recommended (so the new view is easy to find). Stage 3 if you require assignee rather than `created_by`.

**Success criteria**

- A PM with 5+ activities can open one place and see what needs attention **for them**.
- Hints are accurate for the activity types you support (document any type-specific rules).

**Out of scope**

- Email digests, Slack nudges, full task manager.

---

## Stage 3 — Ownership & assignments

**Status:** `Shipped` — **Shipped in:** 2026-04-26 (`insights.discovery_lead_id`, `discovery_activities.assignee_id`, board + activity + insight UI, owner filters, “My discovery” query).

**Goal:** **Who** is leading or contributing to a piece of discovery is explicit on the board, tree stub, and insight pages.

**Description**

`created_by` is not enough for teams: work gets **handed off**, and leaders need to filter by owner. This stage introduces **assignment** at the right granularity.

**Recommended granularity (choose early)**

- **Option A:** Assign **lead** on `insights` (one owner per insight; all activities inherit visibility).
- **Option B:** Assign **lead** (and optional contributors) per `discovery_activity` (finer, more overhead).
- **Option C:** Both — insight owner = default; activity can override.

**Scope (typical deliverables)** — *shipped*

- [x] Schema: `insights.discovery_lead_id` and `discovery_activities.assignee_id` (see `packages/db/sql/ensure_discovery_assignments.sql` for idempotent local apply).
- [x] UI: project-member pickers on **insight** (default lead) and **activity** (assignee); **owner** on board cards and “My discovery”; board `?owner=` filter.
- [x] Queries: `listDiscoveryActivitiesForBoard` + `listMyDiscoveryActivitiesForUser` use effective owner; editors only can change assignee/lead (`userCanEditProject`).

**Dependencies:** Stage 0; Stage 2 strongly benefits from this (replace `created_by` filter).

**Success criteria**

- Every activity or insight (per your rule) can show **who owns** it; filters work for the current project.
- Permissions: only editors can change assignee; viewers see names (align with existing `userCanEditProject` patterns).

**Out of scope**

- Full RACI, time tracking, capacity planning.

---

## Stage 4 — Discovery stage model (beyond activity status)

**Status:** `Shipped` — **Shipped in:** 2026-04-26 (`insights.discovery_stage` 1–5, insight + board + list UI; board `?column=1-4` = Kanban **activity** columns; see `DiscoveryInsightStage` in `enums.ts`).

**Goal:** Users see **where they are in the discovery process**, not only draft/in progress/complete on a single activity.

**Description**

Activity **status** answers “is this card done?” It does not answer “are we still recruiting?” or “ready to decide?” A **discovery stage** (or **milestone**) is a coarser signal, often at **insight/opportunity** level: e.g. *Framing → Recruiting → Running research → Synthesis → Decision*.

**Scope (typical deliverables)** — *shipped in v1*

- [x] Integer enum on `insights` (`discovery_stage` default 1 = framing … 5 = decision) — `packages/db/sql/ensure_discovery_insight_stage.sql`.
- [x] UI: stage on insight discovery page (editors), read-only for viewers; badges on **Insights in discovery** list, **board** cards, **My discovery**; board filter `?column=1-4` = same labels as Kanban columns (optionally with insight + owner filters).
- [ ] **Gates** (deferred): e.g. cannot mark “Decision” until N activities complete.

**Dependencies:** Stage 1–3 recommended so the UI isn’t fragmented.

**Success criteria**

- Team leads can scan the board or insight list and see **process position**, not only per-activity status.
- Stages are documented in one place (enum + user-facing labels).

**Out of scope**

- Custom stages per tenant (start with one global set).

---

## Stage 5 — Opportunity–solution map (OST) v1

**Status:** `Shipped` — **Shipped in:** 2026-04-26 (`/app/discover/map`, `projects.ost_map_root` JSON, read-first tree, editor root form).

**Goal:** A **shared structural view**: outcomes → opportunities → solutions → experiments, aligned with how PMs learn before building.

**Description**

**v1** should be **useful without a perfect Teresa Torres clone**:

- **Read-first tree:** Root = link to strategy outcome or project goal (text or URL); children = **insights** (opportunities); under each insight, list **discovery activities** as experiments; optional **solution hypotheses** as lightweight text nodes or linked specs.
- **Ownership** and **stage** from earlier stages surface on nodes.

**v2+** can add: reorderable tree, multiple solutions per opportunity, experiment templates, confidence scores.

**Scope (typical deliverables)** — *v1 shipped*

- [x] Data: **`projects.ost_map_root` JSON** (`{ text?, url? }`) + tree from `insights` + `discovery_activities` (`ensure_project_ost_map_root.sql`); `getDiscoveryOstMap` for the UI payload.
- [x] Route: **`/app/discover/map`** = **dedicated OST Map page** (full height canvas, back link to Discover). The **same** map is **embedded** on `/app/discover` (`DiscoverOstMapPanel` with `mode="embed"`; **Open full page** points here). **Discover** sidebar item **OST Map** uses this path (not a hash on the hub).
- [x] UI: **read-first graph** (`DiscoveryOstMapView` / `DiscoveryOstMapGraph` — outcome → opportunities → solution lines → activities), links to insight + activity, **owner** + **insight process stage** on nodes, root **goal** edit for editors, modals for add opportunity / activity / solution lines, etc. (not a `<details>` list — interactive canvas on a dot grid).

**Dependencies:** Stages 3–4 help (owner + stage on nodes); Stage 0 required.

**Success criteria**

- A new teammate can open the map and understand **what is being explored** and **how it connects** without opening every insight first.

**Out of scope**

- Real-time collaboration cursors, import from Miro.

---

## Stage 6 — Strategy & roadmap linkage

**Status:** `Not started`

**Goal:** Discovery work is visibly tied to **strategy bets** and **roadmap** themes so prioritization debates have context.

**Description**

Without links, discovery feels like a side channel. This stage adds **tags or foreign keys** from insights (or OST nodes) to entities you already have: strategy pillars, roadmap items, quarters, or “bet” records.

**Scope (typical deliverables)**

- Schema or reuse of existing strategy tables in `packages/db` (audit `/app/strategy` and related schema first).
- UI: pickers on insight or discovery settings; filters on board, map, and “My discovery.”
- Optional: **Build** hint — “No linked spec yet” when discovery completes.

**Dependencies:** Stage 5 optional but powerful (show tags on map); Stage 0 minimum.

**Success criteria**

- Reporting or leadership can filter discovery by **roadmap/theme**.
- PMs can answer: “Why are we researching this now?” from inside Discover.

**Out of scope**

- Full OKR cascade automation.

---

## Stage 7 — Team rituals & notifications (optional late phase)

**Status:** `Not started`

**Goal:** The system **nudges** the team when discovery stalls or completes, without replacing project management tools.

**Description**

Examples: weekly digest of **stuck** items (in progress > N days, no findings), **unassigned** new activities, **decision ready** insights with no spec link.

**Scope (typical deliverables)**

- Worker job or reuse of pulse email patterns; user preferences (opt-in).
- In-app notification list (if product already has a pattern).

**Dependencies:** Stages 2–3 minimum (who to notify, what “stuck” means).

**Success criteria**

- Measurable reduction in “forgotten” discovery cards in dogfood or pilot teams (qualitative is fine initially).

---

## Suggested build order (summary)

| Order | Stage | Theme |
|------:|-------|--------|
| ✓ | 0 | Baseline (done) |
| ✓ | 1 | IA & Discover hub clarity |
| ✓ | 2 | My discovery queue |
| ✓ | 3 | Assignments |
| ✓ | 4 | Insight-level discovery stages |
| ✓ | 5 | OST map v1 |
| 6 | 6 | Strategy / roadmap links |
| 7 | 7 | Nudges & digests |

You can **swap 4 and 5** if a visual map is higher priority than explicit stage enums; assignments (Stage 3) should usually come before heavy team views.

---

## Maintenance

When a stage ships, update its **Status** at the top of its section and add a one-line **Shipped in:** note (PR link or date). Keep agent implementation briefs in dated session folders and link them here in a bullet under the stage.
