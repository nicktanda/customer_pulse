# Design Overhaul Brief — Saturday 25 April 2026

**Goal:** Eliminate the flat, "same dark shade everywhere" look and give the app real visual hierarchy, depth, and polish — without changing any data model, server actions, or API routes.

Screenshots reviewed: Dashboard, Feedback list, Integrations, Insights, Settings.

---

## What the screenshots showed

### The core problem
Everything blends into one dark mass. Cards and the page background are virtually the same colour. There is no visual elevation, no depth, no sense that content is organised into distinct sections. Nothing "pops".

### Page-by-page findings

| Page | Key issues | Status |
|------|------------|--------|
| **Dashboard** | Metric tiles invisible against the background; section h2s have no visual weight; "Needs attention" list is a featureless dark rectangle; breakdown bars are tiny and dull | Tiles + h2s ✅ · Breakdown bars ⬜ · "Needs attention" row styling ⬜ |
| **Feedback** | Table rows dense and flat; badge colours inconsistent (no semantic system); filter area blends into the table | ⬜ not started |
| **Integrations** | Plain orange-text list — no source icons, no status badges, no padding; the only visual difference between enabled and disabled is a small grey text suffix | ✅ done |
| **Insights** | Two cards floating in a huge empty dark page; no visual weight to insight titles; confidence % is just plain text; lots of dead space | ✅ done |
| **Settings** | Section cards reasonable, but form inputs have inconsistent styling and the Save button colour doesn't match the theme | ⬜ not started |
| **Sidebar** | Nav item icons at 0.7 opacity feel muted; group labels (LEARN, BUILD, etc.) almost invisible; active item pill colour is subdued | ✅ done |
| **Mode bar / header** | Mode bar used `bg-body` (darkest shade) so it receded; inactive tab labels nearly invisible; no separator under sidebar logo | ✅ done |

---

## Design principles to follow

1. **Cards must float** — a card's background should always be one shade lighter than the page background, in both light and dark mode.
2. **Ember is the accent, not the text colour** — use it for borders, active states, and CTAs; not for all interactive text.
3. **Hierarchy through size and weight** — section headings should be noticeably larger than body text. Use `fw-semibold` or `fw-bold`, not `fw-medium`.
4. **Status always has a badge** — enabled/disabled, priority, category — all should use Bootstrap badge pills with semantic colours (success = green, secondary = grey, etc.).
5. **Empty space needs intention** — either fill it (grid layout) or add a clear call-to-action so the space reads as a deliberate empty state.

---

## Tech constraints

| Constraint | Detail |
|------------|--------|
| Stack | Next.js 15 App Router · Bootstrap 5 + react-bootstrap · Tailwind utilities (preflight off) |
| Icons | `lucide-react` is installed — use it. No new npm packages. |
| Theme | Light and dark both supported. Dark mode uses `data-bs-theme="dark"` on `<html>`. CSS vars: `--k-ember`, `--bs-primary`, `--bs-body-bg`, `--bs-secondary-bg`, `--bs-tertiary-bg` |
| Accent | Ember orange — `#C4501A` (light) / `#E8793A` (dark) — defined as `--bs-primary` |
| Server components | `apps/web/src/app/app/layout.tsx` is a Server Component. **Do not add `"use client"` to it.** |
| Data | Do not change DB queries, server actions, or API routes — presentation layer only |
| Lint | Run `yarn workspace web lint` after every batch of changes |

---

## Completed fixes (Sat 25 Apr 2026 session)

### ✅ Priority 1 — Card / background contrast (`globals.css`)

**Problem:** Bootstrap `.card` defaults to `--bs-body-bg` in dark mode, which is the same as the page background. Everything looks flat.

**What was done:** Added one CSS rule before `.card.shadow-sm`:

```css
[data-bs-theme="dark"] .card {
  background-color: var(--bs-secondary-bg);
}
```

`--bs-secondary-bg` is `#1E1B18`, one step lighter than the page `#141210`. Light mode cards already use white on an off-white background so no override was needed there. This single rule makes every card on every page float off the background.

---

### ✅ Priority 2 — MetricTile (`apps/web/src/components/ui/MetricTile.tsx`)

**What was done:**
- Number: `font-size` `1.75rem → 1.875rem`, `font-weight` `600 → 700`
- Label: `letter-spacing` `0.07em → 0.08em` (slightly wider tracking for small-caps effect)
- Card: added `transition: "box-shadow 0.15s ease"` inline so hover animations are smooth

The ember left-border was already present — it simply became visible once the card contrast fix landed.

---

### ✅ Priority 3 — IntegrationListRows (`apps/web/src/components/integrations/IntegrationListRows.tsx`)

**What was done:**
- Imported 13 Lucide icons; built a `SOURCE_ICONS` map keyed on `sourceType` integer, with `PlugZap` as the fallback for unknown types.
- Icon circle: 2 rem × 2 rem, `border-radius: 50%`, `background: rgba(var(--bs-primary-rgb), 0.15)`, ember-coloured icon at 16 px — adapts to light/dark automatically via CSS variables.
- Row padding: added `py-3 px-3` to each `<li>`.
- Integration name: `fw-medium → fw-semibold`.
- Source type: displayed in its own `<p className="small text-body-secondary">`, separated from status.
- Status: replaced `· enabled` / `· disabled` plain text with `<span class="badge text-bg-success">Enabled</span>` or `<span class="badge text-bg-secondary">Disabled</span>`, floated right.
- `"use client"` directive preserved.

**Icon map used:**

| sourceType | Label | Icon |
|-----------|-------|------|
| 0 | Linear | `Layers` |
| 1 | Google Forms | `ClipboardList` |
| 2 | Slack | `MessageSquare` |
| 3 | Custom API | `Code2` |
| 4 | Gong | `Phone` |
| 5 | Excel Online | `Table` |
| 6 | Jira | `Trello` |
| 7 | LogRocket | `Monitor` |
| 8 | FullStory | `Video` |
| 9 | Intercom | `MessagesSquare` |
| 10 | Zendesk | `Headphones` |
| 11 | Sentry | `AlertTriangle` |
| 12+ | (any unknown) | `PlugZap` |

---

### ✅ Priority 4 — InsightListCards (`apps/web/src/components/insights/InsightListCards.tsx`)

**What was done:**
- Title: added `fw-semibold` to the `<h2 className="h6">`.
- Confidence: replaced plain text with `<span class="badge text-bg-primary">{score}%</span>`, placed inline next to the date/feedback-count metadata.
- Card body padding: `py-3 → p-4`.
- Semantic badge colours: replaced the flat `text-bg-light border` on all three badges with helper functions keyed on enum values:

  | Insight type | Badge class |
  |-------------|-------------|
  | Problem (0) | `text-bg-danger` |
  | Opportunity (1) | `text-bg-success` |
  | Trend (2) | `text-bg-info` |
  | Risk (3) | `text-bg-warning` |
  | User need (4) | `text-bg-primary` |

  | Severity | Badge class |
  |---------|-------------|
  | Informational / Minor | `text-bg-secondary` |
  | Moderate | `text-bg-warning` |
  | Major / Critical | `text-bg-danger` |

  | Status | Badge class |
  |--------|-------------|
  | Discovered | `text-bg-primary` |
  | Validated | `text-bg-success` |
  | In progress | `text-bg-info` |
  | Addressed / Dismissed | `text-bg-secondary` |

- Grid layout: each `<li>` now has `className="col-md-6"` so cards sit two-per-row on medium+ screens.

Also updated `apps/web/src/app/app/learn/insights/page.tsx`: changed the outer list wrapper from `d-flex flex-column gap-3` to `row g-3` so the grid column classes activate.

---

### ✅ Priority 5 — Dashboard section headings (`apps/web/src/app/app/page.tsx`)

**What was done:** All four `<h2>` section headings ("At a glance", "Needs attention", "Volume and mix", "Recent activity") received:
- `fw-semibold` — noticeably heavier than surrounding body text.
- `border-bottom border-secondary-subtle pb-2` — a subtle ruled line that delineates each section.

---

### ✅ Priority 6 — SidebarNav (`apps/web/src/components/SidebarNav.tsx`)

**What was done:**
- Icon opacity: inactive items `0.7 → 0.85`.
- Nav item `font-size`: `0.8125rem → 0.875rem`.
- Group label (LEARN, BUILD, etc.): added `borderLeft: "2px solid var(--bs-primary)"` and `paddingLeft: "0.4rem"` — the ember stripe makes section boundaries immediately clear.

---

### ✅ Mode bar + sidebar logo (`apps/web/src/components/ModeBar.tsx` · `apps/web/src/app/app/layout.tsx`)

**Problem:** The mode bar used `bg-body` (`#141210`) — the absolute darkest shade — which made it recede visually. The sidebar uses `bg-body-secondary` (`#1E1B18`), so the mode bar was darker than the sidebar, creating a mismatched "frame". Inactive tab labels were `var(--bs-secondary-color)` and nearly unreadable. The sidebar logo had no visual separation from the nav below it.

**What was done:**

`ModeBar.tsx`:
- Outer div: changed `bg-body` → `bg-body-secondary` so the mode bar matches the sidebar and both form a consistent shell around the lighter main content area (`bg-body-tertiary`).
- Inactive tab label colour: changed from `var(--bs-secondary-color)` → `var(--bs-body-color)` so inactive modes are clearly readable.
- Inactive tab label weight: `400 → 500` — slightly more presence without competing with the active tab.
- Active tab: added `background: rgba(var(--bs-primary-rgb), 0.07)` with `borderRadius: "0.375rem 0.375rem 0 0"` — a subtle ember tint behind the selected tab so the active state reads immediately, not just from the bottom border.
- Sublabel font-size: `0.6875rem → 0.75rem` — easier to read, less visual noise.
- Added `background` to the CSS transition so the active tab tint fades in smoothly.

`layout.tsx` (sidebar logo area):
- Added `pb-3 mb-3 border-bottom border-secondary-subtle` to the logo mark container so the "CUSTOMER PULSE" wordmark has a clear dividing line from the navigation below it.

---

## Still to do

### ⬜ Feedback page (`apps/web/src/app/app/learn/feedback/`)

The feedback list is the most-used page and still has the original flat look. Key files to read first:
- `apps/web/src/components/feedback/FeedbackResultsTable.tsx` (or similar) — the main table
- `apps/web/src/components/feedback/FeedbackListFilters.tsx` (or similar) — the filter bar

Issues to fix:
1. **Table rows** — increase `padding` per row, add a subtle `border-bottom` between rows so they're scannable; currently dense and flat.
2. **Badge colours** — priority badges (P1–P4), status badges (New, Triaged, etc.), and category badges all use ad-hoc colours; apply the same semantic badge system used in Insights: P1→`text-bg-danger`, P2→`feedback-priority-badge--p2` (already defined), status→semantic colours.
3. **Filter bar** — the filter area blends into the table. Give the filter row a `background-color: var(--bs-tertiary-bg)` or a card wrapper with a subtle `border-bottom` so it reads as a distinct control zone above the list.

---

### ⬜ Dashboard — breakdown bars (`apps/web/src/app/app/page.tsx`, `globals.css`)

The `.feedback-breakdown-bar` is only `0.4rem` tall and the fill opacity is `0.75`. To make it more readable:
- Increase bar height: `0.4rem → 0.5rem` in `.feedback-breakdown-bar`.
- Increase fill opacity: `0.75 → 0.9` in `.feedback-breakdown-bar__fill`.
- Consider increasing the `min-width` of a filled bar from `3px` to `4px` so very small values are still visible.

---

### ⬜ Dashboard — "Needs attention" list visual weight

The `<ul className="list-group shadow-sm border-secondary-subtle">` that holds high-priority feedback is now a floating card (thanks to Priority 1), but individual rows could be improved:
- The priority label (`P1 / P2`) and status inside each row could be wrapped in a small badge rather than plain text — e.g. `<span class="badge text-bg-danger">P1</span>`.
- Consider adding a coloured left-border accent on P1 rows (3 px, danger colour) to make them visually urgent.

---

### ⬜ Settings page (`apps/web/src/app/app/settings/`)

Issues identified in the original screenshots:
1. **Form inputs** — some inputs may have inconsistent border/focus styling vs. the ember theme. Audit `<input>`, `<select>`, and `<textarea>` elements; Bootstrap's `:focus` ring should already pick up `--bs-focus-ring-color` (ember), but check that none have been manually overridden.
2. **Save button** — verify the primary Save / submit button uses `btn-primary` (which maps to ember) and not a hard-coded blue. If it's using `btn-success` or `btn-info`, change it to `btn-primary`.
3. **Section card headers** — if section cards have a `card-header`, give it `background-color: var(--bs-tertiary-bg)` so it reads as a distinct header zone rather than blending into the card body.

---

## Verification checklist

- [x] `yarn workspace web lint` passes with no errors
- [x] Cards are visually distinct from the page background in dark mode
- [ ] Cards are visually distinct from the page background in light mode (toggle with the Appearance button)
- [x] Integrations page shows icons and proper status badges
- [x] Insights cards have readable, weighted titles and visible confidence badges
- [x] Dashboard metric tiles are clearly separated from the background
- [x] Mode bar background matches the sidebar; inactive tabs are readable
- [ ] Feedback page badge colours are semantic and rows are scannable
- [ ] Breakdown bars are taller and more readable
- [ ] Settings form inputs and Save button use ember theme consistently
- [x] No existing data or functionality is broken

---

*Design brief generated Sat 25 Apr 2026 — based on live screenshots of the running dev server at localhost:3001*
*Updated Sat 25 Apr 2026 after session 1 implementation*
