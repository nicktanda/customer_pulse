# Discover hub landing + OST Map as its own page

**Date:** 2026-04-26  
**Area:** Discover / OST map

## Summary

- **`/app/discover`** — Rich **hub**: at-a-glance counts (with links into board columns / my queue), **Who’s doing what** (grouped by effective owner; special **unassigned-only** full-width layout), **Recently updated**, then **embedded OST map** (`DiscoverOstMapPanel` `mode="embed"`). Removed the redundant in-page **Go to** strip; **sidebar** lists destinations.
- **`/app/discover/map`** — **Dedicated OST Map page** (same `DiscoveryOstMapView` / graph; `DiscoverOstMapPanel` `mode="page"`). Sidebar **OST Map** points here (path-based nav, no `#` hash).
- **Data / lib:** `getDiscoveryActivityStatusCounts`, `listDiscoveryActivitiesForBoard` (`limit`, `excludeArchived`), `buildWhosDoingWhatGroups` ([`discovery-whos-doing-what.ts`](../../../apps/web/src/lib/discovery-whos-doing-what.ts)), tests in `discovery-whos-doing-what.test.ts`.
- **Roadmap:** [`STAGES.md`](../discovery-roadmap/STAGES.md) Stage 1 + Stage 5 bullets updated; [`README.md`](../discovery-roadmap/README.md) baseline updated.

## Key files

| Area | Path |
|------|------|
| Hub page | `apps/web/src/app/app/discover/page.tsx` |
| Hub UI | `apps/web/src/components/discover/DiscoverHubContent.tsx` |
| OST embed + full page chrome | `apps/web/src/components/discover/DiscoverOstMapPanel.tsx` |
| OST route | `apps/web/src/app/app/discover/map/page.tsx` |
| Nav | `apps/web/src/app/app/layout.tsx`, `apps/web/src/components/SidebarNav.tsx` |
| DB queries | `packages/db/src/queries/discovery.ts` |

## Not in this note

- Interview guide / survey / assumption map / competitor agent briefs (`02`–`05`) — separate deliverables.
- **`07-discovery-kanban-board.md`** — board shipped earlier; hub links to board filters.
