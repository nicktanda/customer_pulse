# Reporting Page UX Redesign Plan

**Date:** Saturday 25 April 2026  
**Goal:** Make the AI assistant and question history easily accessible without scrolling past all the analytics charts.

---

## The Problem

The current Reporting page is a single long scroll:

1. Header
2. Time range controls
3. Summary stat cards
4. Feedback volume chart
5. Four breakdown bar charts
6. Top themes + Recent insights
7. Pinned charts
8. **Ask about your feedback** (NL assistant) ← buried
9. **Recent questions** (history) ← buried

The "Ask AI" features are powerful but they live at the very bottom, below a lot of chart content. Users have to scroll significantly to reach them, and there's no visual cue that they're even there.

---

## Proposed Solution: Two-Tab Layout

Split the page into two clearly labelled tabs, both sharing the global time-range controls at the top.

```
┌─────────────────────────────────────────────────────────┐
│  Reporting                                               │
│  Time range: [7d] [30d] [90d]                           │
├──────────────┬──────────────────────────────────────────┤
│  Overview    │  Ask AI                                  │  ← tab bar
└──────────────┴──────────────────────────────────────────┘
```

### Tab 1 — Overview (default)

Everything a user sees today in the "dashboard" portion:

- Summary stat cards (feedback count, themes, insights)
- Feedback volume line chart
- Breakdown bar charts (category, priority, status, source)
- Top themes + Recent insights side-by-side
- Pinned charts grid

### Tab 2 — Ask AI

Everything related to the NL assistant, surfaced prominently:

- `ReportingNlAssistant` at the **top** of the tab (not buried below charts)
- Recent questions history list below it (still scoped to this project)

Pinned charts stay on Overview — they're saved outputs that belong on the dashboard view, not hidden inside the AI tab.

---

## Why Tabs (not alternatives)

| Option | Verdict |
|--------|---------|
| **Tabs** (recommended) | Clean separation, one click away, familiar UX pattern, works well with Bootstrap nav-tabs |
| Floating "Ask AI" button / drawer | More complex to build; overlay UX can feel disconnected from context |
| Side-by-side split panel | Requires a lot of horizontal space; charts would get cramped on smaller screens |
| Collapsible sections | Still requires scrolling to find them; doesn't solve discoverability |

---

## Tab Switching — URL-Based

Use a `?tab=overview|ask` query param (same pattern as the existing `?range=` param).

- Default (no param or `?tab=overview`) → shows the Overview tab
- `?tab=ask` → shows the Ask AI tab
- Time range (`?range=30`) is kept as a separate param and applies to both tabs
- Full URL example: `/app/reporting?range=30&tab=ask`

**Why URL-based (not `useState` client tabs):**
- Keeps `page.tsx` as a Server Component — no refactor needed
- Tab state is bookmarkable and shareable
- Browser back/forward works naturally
- Consistent with how `?range=` already works on this page

---

## Visual Design

Use Bootstrap's `nav nav-tabs` pattern, consistent with the rest of the app's Bootstrap usage.

```
[Overview]  [Ask AI ✦]
```

Consider a small indicator on the Ask AI tab (e.g. a dot or sparkle icon) to draw attention to it for first-time users who don't know it exists.

The time range controls sit **above** the tab bar — they're global and apply to both tabs, so they shouldn't feel like they belong to either tab specifically.

Layout sketch:

```
PageHeader: "Reporting"
──────────────────────────────────────────
Time range: [7d] [30d] [90d]
──────────────────────────────────────────
[Overview]  [Ask AI ✦]          ← nav-tabs
──────────────────────────────────────────

  Tab 1 (Overview):              Tab 2 (Ask AI):
  ┌──────┐ ┌──────┐ ┌──────┐    ┌──────────────────────────┐
  │ 142  │ │  18  │ │   9  │    │ Ask about your feedback  │
  │items │ │themes│ │insigh│    │ [textarea..................│
  └──────┘ └──────┘ └──────┘    │ .........................]│
  Volume chart                  │ [Answer] [Report + Charts]│
  4× Breakdown charts           │           [Submit →]      │
  Top themes | Recent insights  └──────────────────────────┘
  Pinned charts                 Recent questions
                                ┌──────────────────────────┐
                                │ ● Answer · Done          │
                                │   "How has churn...      │
                                └──────────────────────────┘
```

---

## Implementation Steps

### 1. Add tab parsing to `page.tsx`

Parse a `tab` search param alongside the existing `range` param.

```ts
// Add alongside parseRangeDays
const VALID_TABS = ["overview", "ask"] as const;
type ReportingTab = (typeof VALID_TABS)[number];

function parseTab(raw: string | undefined): ReportingTab {
  return VALID_TABS.includes(raw as ReportingTab) ? (raw as ReportingTab) : "overview";
}

// In the component:
const activeTab = parseTab(typeof sp.tab === "string" ? sp.tab : undefined);
```

### 2. Extract a `ReportingTabBar` client component

A small client component that renders the Bootstrap nav-tabs and uses the current URL to highlight the active tab. Accepts `activeTab` and `rangeDays` as props so it can build the correct `href` for each tab link.

```
apps/web/src/components/reporting/ReportingTabBar.tsx
```

### 3. Conditionally render tab content in `page.tsx`

Wrap the two groups of content in a simple conditional:

```tsx
{activeTab === "overview" && (
  <>
    {/* stat cards */}
    {/* volume chart */}
    {/* breakdown charts */}
    {/* themes + insights */}
    {/* pinned charts */}
  </>
)}

{activeTab === "ask" && (
  <>
    <ReportingNlAssistant defaultRangeDays={rangeDays} />
    {/* recent questions */}
  </>
)}
```

No new DB queries needed — the NL history and pinned charts are already fetched server-side. When `tab=overview` we simply skip rendering the assistant, and vice versa. This means only the data relevant to the active tab is rendered to the DOM, which is a small performance win too.

### 4. Update time-range links to preserve the active tab

The existing time-range `<Link>` buttons need to keep the `tab` param when switching ranges:

```tsx
href={`/app/reporting?range=${d}&tab=${activeTab}`}
```

### 5. (Optional) Badge / indicator on Ask AI tab

Add a small `✦` or sparkle text next to "Ask AI" in the tab bar so users notice the feature without requiring a tooltip.

---

## Files to Change

| File | Change |
|------|--------|
| `apps/web/src/app/app/reporting/page.tsx` | Add `parseTab()`, `activeTab`, tab-conditional rendering, preserve `tab` in range links |
| `apps/web/src/components/reporting/ReportingTabBar.tsx` | **New file** — Bootstrap nav-tabs component |

No changes needed to `ReportingNlAssistant`, `PinnedChartGrid`, `ReportingCharts`, or any API routes.

---

## Acceptance Criteria

- [ ] Landing on `/app/reporting` shows the Overview tab by default
- [ ] Clicking "Ask AI" navigates to `?tab=ask` and shows the assistant + history
- [ ] Clicking "Overview" navigates to `?tab=overview` and shows charts + pinned charts
- [ ] Time range buttons preserve the active tab in the URL
- [ ] Both tabs respect the selected `?range=` value
- [ ] Page works correctly without JavaScript (URL-based tabs are server-rendered)
- [ ] No existing functionality is removed — only reorganised

---

## Out of Scope (future ideas)

- Persisting last-used tab to user preferences
- A "History" third tab that shows all past NL requests with full responses
- Moving pinned charts to the Ask AI tab (or showing them in both)
- Deep-linking to a specific NL question from the history list
