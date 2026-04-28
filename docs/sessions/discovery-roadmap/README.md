# Discovery feature roadmap (sessions)

Long-lived planning folder for the **Discover** area: team map, personal queues, opportunity–solution thinking, and links to strategy/roadmap.

| Document | Purpose |
|----------|---------|
| [`STAGES.md`](./STAGES.md) | Phased roadmap with goals, scope, dependencies, and success criteria for each stage |

## How to use this

- **Product / design:** Read stages in order; later stages assume earlier primitives (e.g. ownership needs stable activity/insight models).
- **Engineering:** Each stage can spawn agent briefs under `docs/sessions/YYYY-MM-DD/` (same pattern as `07-discovery-kanban-board.md`).
- **Status:** Mark stages in `STAGES.md` as *Not started* / *In progress* / *Shipped* when you update the plan.

## Current product baseline (April 2026)

- Insights from Learn; discovery **activities** (`discovery_activities`) with types (interview guide, survey, etc.) and **status** (draft → in progress → complete → archived).
- Routes: Discover **hub** at `/app/discover` (landing: at-a-glance stats, who’s doing what, recently updated, **embedded OST map** and link to the full page), **OST Map** (full page) at `/app/discover/map`, **insight workspace** at `/app/discover/workspace`, per-insight activity list, per-activity view, **insights in discovery** list, **board** at `/app/discover/board`, **My discovery** at `/app/discover/me`. **Sidebar** is the main jump list; the hub does not duplicate a second “go to” strip.

## Completed in roadmap work (as of 2026-04-26)

- **Stage 1 (information architecture):** Shipped. Discover has a clear hub vs workspace split, stable URLs, and legacy `?insight=` support from the hub. App sidebar: **all** main area headings (Learn, Discover, Build, Monitor, Workspace) use the same pattern — the uppercase **section title** acts as a control to show or hide that section’s links when you are *not* on a route in that section; the section for the current route is expanded automatically. Implementation: `NavGroupSection` in [`apps/web/src/components/SidebarNav.tsx`](../../../apps/web/src/components/SidebarNav.tsx) and `sidebarNavGroups` in [`apps/web/src/app/app/layout.tsx`](../../../apps/web/src/app/app/layout.tsx).
- **Stage 2 (“My discovery” queue):** Shipped. Route [`/app/discover/me`](../../../apps/web/src/app/app/discover/me/page.tsx): personal queue with status sections and hints; see Stage 2 in [`STAGES.md`](./STAGES.md) for the `created_by` → **Stage 3** owner-model evolution.
- **Stage 3 (ownership & assignments):** Shipped. Insight **discovery lead** (default owner), per-activity **assignee** override, **owner** on board and “My discovery,” board `?owner=` filter. DB columns + UI wired in 2026-04-26; apply SQL ensure script locally if your DB predates the columns.
- **Stage 4 (insight process stage):** Shipped. **`insights.discovery_stage`** (1 = framing through 5 = decision), labels in `apps/web` `discovery-insight-stage.ts`, editor control on the insight’s Discover page, badges on board / me / insights list. The **board** filter `?column=1-4` matches **Kanban columns** (activity status: Draft…Archived), not the insight’s process stage. Run `ensure_discovery_insight_stage.sql` if the column is missing.
- **Stage 5 (OST / discovery map v1):** Shipped. [`/app/discover/map`](../../../apps/web/src/app/app/discover/map/page.tsx) — dedicated **OST Map** page; same canvas **embedded** on the Discover hub via [`DiscoverOstMapPanel`](../../../apps/web/src/components/discover/DiscoverOstMapPanel.tsx). Data from **`projects.ost_map_root`** + `getDiscoveryOstMap`. Run `ensure_project_ost_map_root.sql` if the column is missing.
- **Hub landing & team visibility (2026-04-26):** The Discover hub ([`page.tsx`](../../../apps/web/src/app/app/discover/page.tsx)) loads status aggregates (`getDiscoveryActivityStatusCounts`), recents, “who’s doing what” (`listDiscoveryActivitiesForBoard` with `excludeArchived` / `limit` + `buildWhosDoingWhatGroups`), and the embedded map. When the only owner bucket is **Unassigned**, the UI uses a **full-width** list (not a narrow card with empty space beside it).

**Next up — Stage 6 (not started):** [Strategy & roadmap linkage](STAGES.md#stage-6--strategy--roadmap-linkage) — tags or FKs from insights to bets / roadmap themes.

This roadmap extends that foundation toward team OST-style visibility and strategy alignment.
