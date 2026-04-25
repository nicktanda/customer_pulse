# Branch Summary — `adding-learn-build-monitor`

> What has been built and changed on this branch compared to `main`.
> Written: Sat 25 Apr 2026

---

## Overview

This branch adds the **Learn → Discover → Build → Monitor** product structure to Customer Pulse.
It reorganises navigation, ships the full Build mode, builds out the Discover mode, and adds
significant UX improvements to Learn. Monitor exists as a placeholder.

There is **one commit** on the branch. A substantial amount of additional work has been done
since that commit but is not yet committed — it's all listed in the "Not yet committed" sections below.

---

## Committed changes

### 1. Navigation shell restructure

**Files:** `apps/web/src/app/app/layout.tsx`, `apps/web/src/components/SidebarNav.tsx`,
`apps/web/src/components/ModeBar.tsx` (new)

- Added the **ModeBar** — a horizontal tab bar at the top of the content area with three modes:
  **Learn** ("What are customers saying?"), **Build** ("What should we build?"),
  **Monitor** ("Is it working?"). Active mode is highlighted in ember orange.
- Restructured the sidebar into labelled sections: **Learn**, **Discover**, **Build**, **Monitor**, **Workspace**.
- Added **Lucide icons** to every sidebar nav item (MessageSquare, Lightbulb, BarChart2, etc.).
- Section headings now have an ember-coloured left border to visually group them.
- The sidebar top area now shows a small ember square logo mark + "Customer Pulse" wordmark.
- The ModeBar is rendered in the layout shell so every page gets it for free.

---

### 2. Route renaming — feedback and insights moved under Learn

The old `/app/feedback/*` and `/app/insights/*` routes have been renamed:

| Old route | New route |
|-----------|-----------|
| `/app/feedback` | `/app/learn/feedback` |
| `/app/feedback/[id]` | `/app/learn/feedback/[id]` |
| `/app/insights` | `/app/learn/insights` |
| `/app/insights/[id]` | `/app/learn/insights/[id]` |

Middleware was updated to redirect old URLs to the new ones so no links break.

---

### 3. Ember colour theme

**File:** `apps/web/src/app/globals.css`

Bootstrap's default blue (`--bs-primary`) has been replaced with **ember orange** (`#C4501A` light / `#E8793A` dark). 
All buttons, nav pills, focus rings, active indicators, and links automatically pick up the new colour.

Token reference:
- `--k-ember: #C4501A` (light mode primary)
- `--k-ember-bright: #E8793A` (dark mode primary)
- `--k-ember-deep: #8B2A0F` (hover/emphasis)
- Success stays green (semantic distinction from ember). Warning/info are neutral grey.
- Dark mode uses slightly warm dark surfaces rather than Bootstrap's pure charcoal.

---

### 4. Build mode foundation

**Files added:** `apps/web/src/app/app/build/page.tsx`, `apps/web/src/app/app/build/specs/page.tsx`,
`apps/web/src/app/app/build/specs/new/page.tsx`, `apps/web/src/app/app/build/actions.ts`

- `/app/build` — landing page (currently shows `ModeLandingPage` marketing template with a 3-step flow and upcoming features preview).
- `/app/build/specs` — specs list, fetches from DB using `getSpecsByProject`.
- `/app/build/specs/new` — new spec form. Accepts a title, description, and up to 5 linked insights. Optional `?from_insight=` param pre-selects an insight.

---

### 5. DB: `specs` and `spec_insights` tables

**Files:** `packages/db/src/schema.ts`, `packages/db/src/enums.ts`, `packages/db/src/queries/specs.ts`,
`packages/db/sql/ensure_specs.sql`

New tables:
- **`specs`** — feature specs with title, description, `user_stories` (JSONB array), `acceptance_criteria` (JSONB array), status, effort/impact scores, `ai_generated` flag, `created_by`.
- **`spec_insights`** — join table linking specs back to the insights that motivated them (the "golden thread").

New enum: **`SpecStatus`** with values `backlog(0)`, `drafting(1)`, `review(2)`, `ready(3)`, `in_progress(4)`, `shipped(5)`.

New query helpers in `queries/specs.ts`: `getSpecsByProject`, `getSpecById`, `createSpec`, `linkSpecToInsights`.

---

### 6. Monitor placeholder

**File added:** `apps/web/src/app/app/monitor/page.tsx`

Shows the `ModeLandingPage` template with an "Is it working?" message and placeholder activation steps. No real data yet.

---

### 7. `ModeLandingPage` component

**File added:** `apps/web/src/components/ui/ModeLandingPage.tsx`

Reusable template for mode area landing pages — accepts a title, description, steps list, and optional preview items. Used by both Build and Monitor landings.

---

### 8. Admin page

**Files added:** `apps/web/src/app/app/admin/page.tsx`, `apps/web/src/app/app/admin/actions.ts`

Dev/test admin page visible only to `UserRole.admin` users. Contains tools like seed feedback forms and query-param driven notices.

---

### 9. Design system reference doc

**File added:** `docs/design.md`

A comprehensive design system reference for all AI agents and contributors — covers colour tokens, card patterns, typography, icons, spacing, and component conventions.

---

## Not yet committed — done since the commit

All of the following are local changes that exist but have not been committed yet.

---

### 10. AI spec generation

**Files:** `apps/web/src/app/app/build/actions.ts` (modified),
`apps/web/src/app/app/build/specs/new/SpecSubmitButton.tsx` (new)

- `createSpecAction` — server action that calls Claude to generate a full spec from the insight evidence:
  user stories, acceptance criteria, success metrics, out-of-scope items, and risks.
- Stores the result in `specs` with `ai_generated = true`, links insights via `spec_insights`, redirects to the detail page.
- `SpecSubmitButton` — client component that shows a loading spinner while the Claude call is in flight.

---

### 11. Spec detail page

**File added:** `apps/web/src/app/app/build/specs/[id]/page.tsx`

Renders all AI-generated spec sections with an "AI Drafted" badge. Shows the linked insights, user stories,
acceptance criteria, and metadata (status, effort/impact scores).

---

### 12. Discover mode — full set of pages and actions

**Files added:**
- `apps/web/src/app/app/discover/page.tsx` — landing (currently `ModeLandingPage` placeholder)
- `apps/web/src/app/app/discover/insights/page.tsx` — list of insights that have discovery activities
- `apps/web/src/app/app/discover/insights/[id]/page.tsx` — insight hub: activity list, add new activity, link to Build
- `apps/web/src/app/app/discover/insights/[id]/new/page.tsx` — new activity form
- `apps/web/src/app/app/discover/activities/[id]/page.tsx` — activity detail with findings, AI draft, status controls
- `apps/web/src/app/app/discover/actions.ts` — server actions: `createDiscoveryActivityAction`, `saveDiscoveryFindingsAction`, `markActivityCompleteAction`, `reopenActivityAction`, `draftActivityWithAIAction`, `generateDiscoverySummaryAction`
- `packages/db/src/queries/discovery.ts` — query helpers: `getActivitiesByInsight`, `getActivityById`, `getInsightsWithDiscovery`, `createDiscoveryActivity`, `updateDiscoveryActivity`

Activity types: interview guide, survey, assumption map, competitor scan, usability test, jobs-to-be-done, prototype hypothesis.

> **Note:** The `discovery_activities` table is not yet added to `packages/db/src/schema.ts`. These pages will crash at runtime until that migration is done.

---

### 13. Discover mode added to sidebar

**File:** `apps/web/src/app/app/layout.tsx` (modified)

A **Discover** section has been added to the sidebar between Learn and Build, with an "Activities" link pointing to `/app/discover`.

---

### 14. Reporting UX redesign — tabs and pinned charts

**Files modified:** `apps/web/src/app/app/reporting/page.tsx`, `apps/web/src/components/reporting/ReportingNlAssistant.tsx`, `apps/web/src/app/api/app/reporting/ask/route.ts`

**Files added:** `apps/web/src/components/reporting/ReportingTabBar.tsx`, `apps/web/src/components/reporting/PinnedChartGrid.tsx`, `apps/web/src/app/api/app/reporting/pin/route.ts`, `apps/web/src/app/api/app/reporting/pin/[id]/route.ts`

The Reporting page was a long scroll with the AI assistant buried at the bottom. It's been redesigned as a two-tab layout:

- **Overview tab** — summary stats, feedback volume, breakdowns, top themes, recent insights, pinned charts.
- **Ask AI tab** — the NL assistant and recent question history, immediately accessible.

Both tabs share the global time-range selector at the top.

Other reporting additions:
- **Pinned charts** — charts generated by the NL assistant can now be pinned. Pinned charts are saved to a new `pinned_report_charts` DB table and appear in a grid on the Overview tab. Can be unpinned with a DELETE API call.
- **NL result charts** — structured chart results from the worker now render as proper Recharts visualisations instead of markdown tables.
- `rangeDays` is now threaded through from the time-range selector into the reporting API and worker job.

---

### 15. Worker: NL reporting and structured reporting improvements

**Files modified:** `apps/worker/src/reporting-nl.ts`, `apps/worker/src/reporting-structured.ts`, `apps/worker/src/job-handlers.ts`

- Structured chart output now uses an extended set of chart types (bar, line, pie, area, scatter).
- The worker job now returns `rangeDays` in its result so the frontend can render the correct time label.
- Improved Claude prompt for more accurate and varied chart generation.

---

### 16. Learn — Insights page improvements

**Files modified:** `apps/web/src/app/app/learn/insights/page.tsx`, `apps/web/src/app/app/learn/insights/[id]/page.tsx`

**Files added:** `apps/web/src/components/insights/ThemeCards.tsx`, `apps/web/src/components/insights/TrendingThemesSection.tsx`, `apps/web/src/components/insights/RegenerateThemesButton.tsx`

- Insights page now shows a **Trending Themes** section above the insights list — theme cards with priority score and insight count.
- A **Regenerate Themes** button calls the `/api/app/insights/themes/regenerate` route to enqueue a fresh theme analysis job.
- Theme cards link to a filtered insights view for that theme.
- Insight detail page (`InsightDetailBody`) has been polished.
- New API route: `POST /api/app/insights/themes/regenerate`.

---

### 17. Learn — Feedback list with peek drawer

**Files modified:** `apps/web/src/app/app/learn/feedback/page.tsx`

**Files added:** `apps/web/src/components/feedback/FeedbackDrawerPanel.tsx`, `apps/web/src/components/ui/PeekDrawerPanel.tsx`

- The feedback list now uses a **peek drawer** — clicking a feedback row slides open a right-side panel with the full feedback detail without leaving the list.
- `PeekDrawerPanel` is a reusable component (used by feedback; can be reused for insights, integrations etc.).
- The standalone feedback detail page (`/app/learn/feedback/[id]`) still exists for deep links.

---

### 18. Strategy page redesign

**Files modified:** `apps/web/src/app/app/strategy/page.tsx`
**Files added:** `apps/web/src/app/app/strategy/DeleteTeamButton.tsx`

Per the design overhaul brief:
- Business strategy section gets a Lucide `Target` icon header and labeled read-only blocks for Objectives and Strategy.
- Teams section heading now shows a team count badge.
- Each team card gets a **header row** with an ember-circle avatar showing the team's first letter and the team name.
- The Add Team form is expanded into its own sub-card with full-width inputs and usable textarea sizes.
- Delete team button is visually separated from Save with a `border-top` divider and extracted into its own `DeleteTeamButton` client component.
- Teams empty state is now a styled card with icon, heading, and body copy.

---

### 19. Mobile top bar

**File added:** `apps/web/src/app/app/MobileTopBar.tsx`

A mobile-only top bar with the Customer Pulse logo and a hamburger menu button that toggles the sidebar open/closed on small screens. Integrated into the responsive layout.

---

### 20. Responsive sidebar

**File modified:** `apps/web/src/app/app/ResponsiveSidebar.tsx`

Updated to work with the new MobileTopBar — sidebar now slides in from the left on mobile and is toggled by the hamburger button.

---

### 21. Claude web helper

**File added:** `apps/web/src/lib/claude.ts`

A shared helper for calling the Anthropic API from Next.js server actions (used by `createSpecAction` and the Discover AI draft actions). Centralises the API key loading, model selection, and JSON parsing.

---

## Summary of what's in the app now vs before this branch

| Area | Before | After |
|------|--------|-------|
| Navigation | Flat sidebar with no sections | Mode-grouped sidebar + ModeBar tab switcher |
| Colour theme | Bootstrap default blue | Ember orange throughout |
| Feedback routes | `/app/feedback` | `/app/learn/feedback` (redirects in place) |
| Insights routes | `/app/insights` | `/app/learn/insights` (redirects in place) |
| Insights page | Basic list | Trending themes section + regen button + peek detail |
| Feedback page | Basic list | Peek drawer for quick review without leaving the list |
| Strategy page | Cramped forms, no visual hierarchy | Polished cards, icons, team avatars, separated delete |
| Reporting page | Long scroll, AI buried | Two-tab layout, Ask AI always one click away, pinned charts |
| Build mode | Didn't exist | Specs list, new spec form, AI spec generation, spec detail |
| Discover mode | Didn't exist | Full set of pages + server actions (DB table still needed) |
| Monitor mode | Didn't exist | Placeholder landing page |
| DB | No specs | `specs`, `spec_insights`, `pinned_report_charts` tables |

---

## What still needs doing before merge

1. **Add `discovery_activities` table to schema** — Discover pages exist but will crash without it.
2. **Commit all the uncommitted work** — items 10–21 above are not yet in a commit.
3. **Run `yarn ci:local`** to confirm lint, tests, and the Next.js production build all pass.

---

*Customer Pulse — branch summary generated Sat 25 Apr 2026*
