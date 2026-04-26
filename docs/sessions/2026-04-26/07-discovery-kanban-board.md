# Build spec: Discovery Kanban board

**Instructions for the agent:** Read this whole document, implement the acceptance criteria, and run `yarn workspace web lint` plus `yarn test` before you stop. Do not change integer enum values in `packages/db/src/enums.ts` without an explicit migration plan and SQL migration.

**Out of scope for this spec:** Opportunity Solution Tree visualization, drag-and-drop libraries, and schema changes (unless you discover a hard blocker — document it instead of silently expanding scope).

---

## Product promise (what we’re shipping)

PMs can open a **project-wide board** of all discovery activities, grouped by **status**, see which **insight** each activity belongs to, and **open** or **move** items into the right column. Moving a card updates the same `discovery_activities.status` field the rest of Discover already uses.

**Primary user flow**

1. Sidebar → Discover → **Board** (new nav item).
2. See columns: **Draft**, **In progress**, **Complete** (and **Archived** — see below).
3. Click a card → existing activity workspace at `/app/discover/activities/[id]`.
4. Change status from the board (dropdown or buttons on the card — no DnD required for v1).

**Optional but valuable:** Query param `?insight=<id>` filters the board to one insight; empty state explains when there are no activities.

---

## Domain rules (must match the codebase)

| Concept | Source |
|--------|--------|
| Activity statuses | `DiscoveryActivityStatus` in `packages/db/src/enums.ts`: `draft=1`, `in_progress=2`, `complete=3`, `archived=4` |
| Activity types | `DiscoveryActivityType` in same file (1–7) — reuse labels already used elsewhere (e.g. `defaultTitleForType` / activity list UI) |
| Update path | `updateDiscoveryActivity` in `packages/db/src/queries/discovery.ts` |
| Auth for mutations | Mirror `requireEditor()` in `apps/web/src/app/app/discover/actions.ts` (`userCanEditProject`, current project) |

**Board columns:** Use **four** columns matching statuses **1–4**. Label **4** as “Archived” and use muted styling so it does not look like “done.” If a column has no cards, show a short empty hint (e.g. “No activities here”).

---

## What already exists (do not break)

| Area | Location |
|------|----------|
| Activity detail (drill-in) | `apps/web/src/app/app/discover/activities/[id]/page.tsx` |
| Per-insight activity list | `apps/web/src/app/app/discover/insights/[id]/page.tsx` |
| Insights-with-discovery list | `apps/web/src/app/app/discover/insights/page.tsx` — link to board from here is nice but not required |
| Discover home | `apps/web/src/app/app/discover/page.tsx` |
| Queries | `packages/db/src/queries/discovery.ts` — extend with a project-scoped list |
| Server actions pattern | `apps/web/src/app/app/discover/actions.ts` |
| Sidebar | `apps/web/src/app/app/layout.tsx` — Discover group currently has “Activities” only |

---

## Implementation tasks (acceptance criteria)

### 1. Data: list activities for the current project

- Add a typed query in `packages/db/src/queries/discovery.ts`, e.g. `listDiscoveryActivitiesForBoard(db, projectId, options?)`.
- **Required fields per row:** `id`, `title`, `activityType`, `status`, `insightId`, `insightTitle` (join `insights`), `aiGenerated`, `updatedAt` (or `createdAt` for sorting — pick one and document in a one-line comment).
- **Filter:** optional `insightId`; when present, `where insight_id = ?`.
- **Order:** deterministic (e.g. `updatedAt desc` then `id desc`).
- Export any new row type from the same file for the web app to import.

### 2. Route: board page

- Add `apps/web/src/app/app/discover/board/page.tsx` (App Router, Server Component).
- Reuse the same access patterns as `apps/web/src/app/app/discover/insights/page.tsx`: no project → message; `userHasProjectAccess` → deny component when appropriate.
- Read `searchParams.insight` (optional string → parse int); pass filter to the query when valid.
- Render `PageShell` + `PageHeader` with title **Discovery board** and a short description.
- Group rows by `status` into four columns; each column shows a header with count.

### 3. Card UI

- Each card: **title** (link to `/app/discover/activities/[id]`), **insight title** as secondary text (link to `/app/discover/insights/[insightId]` optional but helpful), **activity type** badge or small label, **AI drafted** indicator if `aiGenerated` is true.
- Use existing Bootstrap / utility classes consistent with `DiscoverInsightsPage` cards — no new design system.
- **Comments:** Add brief JSX or file-level comments for a newer developer (repo owner preference) explaining that status integers map to columns.

### 4. Status changes (server action)

- In `apps/web/src/app/app/discover/actions.ts`, add something like `setDiscoveryActivityStatusAction(activityId, nextStatus)`:
  - Call `requireEditor()`.
  - Validate `nextStatus` is **1, 2, 3, or 4** only.
  - Load the activity with `getActivityById` (or a minimal existence check) and ensure `projectId` matches the current project — **never** update another project’s row.
  - Call `updateDiscoveryActivity` with `{ status: nextStatus }`.
  - `revalidatePath` for `/app/discover/board`, `/app/discover/insights`, and `/app/discover/insights/[id]` (use dynamic revalidation pattern Next supports, or revalidate the specific insight path if you have the `insightId` from the row).
- Expose status change in the UI as a **small form** with hidden fields or a `<select>` + submit — prefer progressive enhancement; avoid requiring client-side only state for the MVP.

### 5. Navigation

- In `apps/web/src/app/app/layout.tsx`, under the Discover group, add **Board** linking to `/app/discover/board` (keep **Activities** as `/app/discover`).

### 6. Tests and CI

- Add at least **one** automated test that guards core behavior:
  - **Preferred:** pure helper tests (e.g. grouping or validation of allowed statuses) in `apps/web/src/lib/` with a `.test.ts` file, **or**
  - a focused test in `packages/db` if you add a small pure function there.
- Run `yarn workspace web lint` and `yarn test` and fix failures.

---

## Files you will likely touch

| File | Change |
|------|--------|
| `packages/db/src/queries/discovery.ts` | New list query + type |
| `apps/web/src/app/app/discover/board/page.tsx` | **New** — board UI |
| `apps/web/src/app/app/discover/actions.ts` | New status action |
| `apps/web/src/app/app/layout.tsx` | Nav item |
| `apps/web/src/lib/*.ts` + `*.test.ts` | Optional grouping/validation helper |

---

## Verification checklist (agent self-check before finishing)

- [ ] Board loads with no activities: friendly empty state for the whole page (not a crash).
- [ ] Board loads with many activities: all four columns render; cards appear under the correct status.
- [ ] `?insight=<valid id>` shows only that insight’s activities; invalid id ignored or treated as no filter (pick one behavior and keep it consistent).
- [ ] Status change updates DB and reflected after refresh; user without edit access cannot change status (same as other discover actions).
- [ ] `yarn workspace web lint` and `yarn test` pass.

---

## Follow-up (do not implement unless this spec is done)

- Drag-and-drop with `@dnd-kit` or similar calling the same server action.
- Opportunity Solution Tree view as a separate route and spec.
- “Create activity” shortcut from the board (requires insight picker modal or redirect to insight page).
