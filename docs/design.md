# Customer Pulse — Design System Reference

> **For AI agents:** Read this before touching any UI file in `apps/web`. It documents the color system, component library, styling conventions, and the Bootstrap + Tailwind strategy so you don't invent a fourth way to do something already standardised here.

---

## Styling stack

| Layer | Role | Notes |
|-------|------|-------|
| **Bootstrap 5** | UI component library (buttons, cards, forms, nav, badges, list-groups, grid) | Imported first in `globals.css`. All BS utility classes (`d-flex`, `gap-*`, `px-*`, `btn-*`, etc.) are available. |
| **Tailwind CSS** | Supplemental utilities + `@apply` in custom classes | Preflight is **disabled** (`corePlugins.preflight: false`) so BS Reboot wins. Use Tailwind utilities in new JSX components. Do **not** rewrite existing BS utility classes to Tailwind equivalents. |
| **`globals.css`** | Theme tokens (CSS custom properties) + Bootstrap overrides + custom component classes | Lives at `apps/web/src/app/globals.css`. This is where ember color tokens, `@apply` patterns, and complex pseudo-selector rules live. |

### The rule of thumb

- **Bootstrap classes** for any UI component that Bootstrap already has (buttons, cards, forms, nav pills, badges, list-groups, modals, tables).
- **Tailwind utilities** in JSX for layout, spacing, and typographic tweaks where Bootstrap doesn't have a direct class or a custom component is being built.
- **`@apply`** in `globals.css` for reusable custom CSS classes that need layout utilities — keeps them composable without duplicating values.
- **Never mix** Tailwind responsive prefixes (`sm:`, `md:`) with Bootstrap breakpoint classes (`d-sm-flex`, `col-md-6`) in the same element.

---

## Color system — ember palette

The app uses a monochrome-with-ember-accent theme adapted from the Kairos project. All colors are CSS custom properties defined in `globals.css`.

### Palette tokens

```css
/* Available globally on :root */
--k-ember:         #C4501A   /* primary action color (light mode) */
--k-ember-bright:  #E8793A   /* primary action color (dark mode), hover states */
--k-ember-deep:    #8B2A0F   /* hero headings, text emphasis */
--k-crimson:       #9B2335   /* reserved for future destructive / urgent states */
--k-gold:          #D4882A   /* reserved for future badge / highlight use */
--k-warm-white:    #F5EDE4   /* reserved — warm white for future dark-surface text */
--k-warm:          #C4A882   /* reserved — secondary text on dark surfaces */
```

### Bootstrap primary token mapping

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| `--bs-primary` | `#C4501A` (ember) | `#E8793A` (ember-bright) |
| `--bs-link-color` | `#C4501A` | `#E8793A` |
| `--bs-link-hover-color` | `#8B2A0F` | `#F5A875` |
| `--bs-focus-ring-color` | `rgba(196,80,26,0.28)` | `rgba(232,121,58,0.35)` |

Everything that uses Bootstrap's primary token automatically inherits ember: `btn-primary`, `link-primary`, active nav pills, the mode-bar underline, selected row accents, focus rings.

### Dark mode surfaces

Dark mode uses slightly warm backgrounds instead of Bootstrap's pure charcoal:

```css
--bs-body-bg:      #141210   /* very dark warm brown-black */
--bs-secondary-bg: #1E1B18
--bs-tertiary-bg:  #252220
```

### Usage guidance

- **CTAs / primary buttons** — `btn btn-primary` (ember)
- **Active sidebar nav pill** — `nav-pills .active` (ember, auto)
- **Mode bar active tab** — ember bottom border (auto via `--bs-primary`)
- **Hero headings** — `style={{ color: "var(--k-ember-deep)" }}`
- **Section labels (small caps)** — `.mode-section-label` CSS class
- **Error / destructive** — `btn-danger` stays Bootstrap red (not ember)
- **Success** — real green (`#3d7a5a` light / `#5aab80` dark), not ember

---

## Typography

The app uses the Bootstrap default system font stack. No custom display font is loaded (unlike the Kairos marketing site which uses Cormorant Garamond for headings).

| Usage | Class / style |
|-------|--------------|
| Page title (h1) | `PageHeader` component → `.h3 text-body-emphasis` |
| Section heading | `.h5 text-body-emphasis` |
| Sub-section heading | `.h6 text-body-emphasis` |
| Small-caps section label | `.mode-section-label` (Tailwind `@apply text-xs font-semibold uppercase tracking-widest`) |
| Body / description | `small text-body-secondary` |
| Muted / tertiary | `text-body-tertiary` |
| Monospace / code | `<code>` or `font-monospace` — color `var(--k-ember-deep)` light / `var(--bs-code-color)` dark |

---

## Spacing

Use Bootstrap spacing utilities (`p-*`, `m-*`, `gap-*`) for consistency. Common patterns:

| Pattern | Class |
|---------|-------|
| Section gap | `mb-5` between major sections |
| Card body internal | `p-3` or `p-4` |
| Form field spacing | `mb-3` |
| Inline icon + text | `gap-2` on flex container |
| Page-wide horizontal padding | `px-4 pb-4 pt-5 p-lg-5` (handled by `app-main-pane` in layout) |

---

## Component library

### Core UI (`apps/web/src/components/ui/`)

Re-exported from `@/components/ui`. Always use these instead of inventing equivalents.

| Component | Purpose | Key props |
|-----------|---------|-----------|
| `PageShell` | Max-width wrapper for page content | `width: "narrow" \| "medium" \| "wide" \| "full"` |
| `PageHeader` | Consistent page title block | `title`, `description`, `back`, `actions` |
| `BackLink` | Muted "← Back to …" link | `href`, `label` |
| `InlineAlert` | Full-width alert banner | `variant: "light" \| "warning" \| ...` |
| `MetricTile` | KPI number tile (dashboard, project stats) | `label`, `value`, `href`, `linkHint` |
| `NarrowCardForm` | Centered form card (settings, edit pages) | `children` |
| `FormActions` | Save / cancel button row for forms | `children` |
| `PaginationNav` | Prev / next pagination bar | `prevHref`, `nextHref`, `status` |
| `ProjectAccessDenied` | "No access" card with back/home links | `pageTitle` |
| `ConfirmSubmitForm` | Confirmation submit with spinner | `children` |
| `StickyDetailAside` | Right-hand sticky detail panel shell | `children`, `aria-label` |
| **`ModeLandingPage`** | Standard mode-area landing page (no data) | See below |

#### `ModeLandingPage` — the mode area template

Use this whenever a Build / Monitor / future mode area has no data to show yet. Renders: hero (kicker + headline + body + CTA) + activation steps + optional middle slot + numbered feature roadmap.

```tsx
import { ModeLandingPage } from "@/components/ui";

<ModeLandingPage
  title="Build"
  pageDescription="Specs for My Project"
  kickerText="No specs yet"
  headline="Start in Learn, finish in Build"
  body={<>Find an insight, click <strong>Create spec</strong>, AI drafts it.</>}
  cta={{ href: "/app/insights", label: "Open Insights" }}
  steps={[
    { step: "1", label: "Find an insight in Learn" },
    { step: "2", label: "Click Create spec" },
    { step: "3", label: "AI drafts it, you refine" },
  ]}
  roadmapTitle="Coming to Build"
  features={FEATURES}
>
  {/* Optional: extra block between hero and roadmap */}
  <div className="callout-block">...</div>
</ModeLandingPage>
```

### Peek-panel components (`@/components/ui` — peek-panel barrel)

Used for master–detail right panels (Feedback, Insights, Pulse Reports, Integrations):

| Component | Purpose |
|-----------|---------|
| `PeekPanelHeader` | Full peek header with toolbar, nav arrows, entity link |
| `SimplePeekPanelHeader` | Simpler variant (close + full-page link) |
| `PeekPanelToolbar` | Action buttons row inside a peek header |
| `PeekPanelNotFound` | "Not found" state for a peek panel |
| `PeekPanelEntityLink` | Pill-style link to the entity full page |
| `IconPeekClose/Open/Chevron*` | SVG icons for peek-panel controls |

### Feature-specific components (`apps/web/src/components/<feature>/`)

| Area | Files | Notes |
|------|-------|-------|
| `feedback/` | `FeedbackDetailBody`, `FeedbackDetailPanelHeader`, `FeedbackListRows`, `FeedbackMetaBadges`, `FeedbackTableSortHeader`, `FeedbackSelectAll`, `FeedbackBulkToolbarGate` | Don't move these to `ui/` — they're too domain-specific. |
| `insights/` | `InsightDetailBody`, `InsightListCards` | |
| `integrations/` | `IntegrationDetailPanel`, `IntegrationListRows` | |
| `projects/` | `ProjectListCards`, `ProjectDetailPanel` | |
| `pulse-reports/` | `PulseReportDetailBody`, `PulseReportListRows`, `PrJobPoller`, `PulseJobPoller`, `PrSubmitButton` | |
| `reporting/` | `ReportingCharts`, `NlResultCharts`, `ReportingNlAssistant`, `rechartsTooltipTheme` | |

### Root components (`apps/web/src/components/`)

| File | Purpose |
|------|---------|
| `ModeBar.tsx` | Learn / Build / Monitor horizontal tab bar (client component) |
| `SidebarNav.tsx` | Grouped sidebar nav links with active-pill state |
| `ThemeToggle.tsx` | Light / dark / system theme picker |
| `theme-storage.ts` | `localStorage` + `data-bs-theme` helpers |

---

## Layout & routing conventions

### App shell structure

```
<div class="d-flex min-vh-100 app-layout-shell">
  <ResponsiveSidebar>            ← 14rem fixed sidebar
    <SidebarNav groups={...} />  ← Learn / Build / Monitor / Workspace sections
  </ResponsiveSidebar>

  <div class="d-flex flex-column flex-grow-1 min-w-0">
    <ModeBar />                  ← Learn | Build | Monitor tabs
    <main class="app-main-pane"> ← scrollable content area
      {children}
    </main>
  </div>
</div>
```

### Sidebar nav groups

The sidebar always shows **Learn / Build / Monitor / Workspace** sections regardless of the active mode. The `ModeBar` above the content is the primary mode switcher; the sidebar sub-nav items change per-mode to show relevant pages.

### Route structure

| URL prefix | Mode / area |
|-----------|-------------|
| `/app` | Dashboard (Learn home) |
| `/app/feedback`, `/app/insights`, `/app/reporting`, `/app/strategy` | Learn |
| `/app/pulse-reports` | Learn (digest history) |
| `/app/build`, `/app/build/**` | Build |
| `/app/monitor`, `/app/monitor/**` | Monitor |
| `/app/integrations`, `/app/recipients`, `/app/settings`, `/app/projects`, `/app/skills` | Workspace |

### Server vs client components

- **Default to server components** — all data fetching happens in the page component.
- **Client components** — only when `usePathname`, `useState`, `useEffect`, or browser APIs are needed. Add `"use client"` to a small dedicated file; keep the page shell as a server component.
- **Server actions** — mutations (create, update, delete). Live in `actions.ts` co-located with the route segment.

---

## Custom CSS classes reference

Classes defined in `apps/web/src/app/globals.css` that you can use in JSX:

| Class | Purpose |
|-------|---------|
| `.mode-section-label` | Small-caps section label (`text-xs font-semibold uppercase tracking-widest` via `@apply`) |
| `.mode-step-circle` | Numbered circle for activation steps in `ModeLandingPage` |
| `.mode-feature-number` | Tabular-nums feature number in `ModeLandingPage` roadmap |
| `.mode-bar-tab` | Mode bar tab link — applies hover underline via CSS |
| `.app-clickable-list-row` | List/table row that opens a detail panel on click |
| `.app-list-row-selected` | Selected row: ember left accent + tinted background |
| `.app-page-shell` | Base page shell (handled by `PageShell` component) |
| `.app-main-pane` | Scrollable main content area (in layout) |
| `.app-sidebar` | Left sidebar (in layout) |
| `.app-back-link` | Muted back link (handled by `BackLink` component) |
| `.app-detail-aside` | Sticky right panel shell (handled by `StickyDetailAside`) |
| `.peek-panel-*` | Peek-panel chrome classes (handled by peek-panel components) |
| `.feedback-*` | Feedback-specific classes (table, breakdown bars, priority badges) |
| `.line-clamp-2` | Two-line text truncation via `@apply line-clamp-2` |

---

## Do's and don'ts for AI agents

### Do
- Use `PageShell` + `PageHeader` on every new page — never invent a page-level heading differently.
- Use `ModeLandingPage` for any new mode area that starts with an empty state.
- Use `btn btn-primary` for primary actions — color is ember automatically.
- Use `text-body-secondary` / `text-body-emphasis` for body / heading colors — they adapt to light/dark.
- Use `border-secondary-subtle` for card/container borders.
- Use `@apply` in `globals.css` when adding new reusable custom CSS classes.
- Extract a component when the same JSX structure appears in 2+ files.

### Don't
- Hard-code hex colors in JSX. Use `var(--k-ember)`, `var(--bs-primary)`, or Bootstrap text color classes.
- Use Bootstrap responsive utilities (`d-md-flex`) and Tailwind responsive utilities (`md:flex`) on the same element.
- Add a `box-shadow` — the design is intentionally flat.
- Use gradients in the app UI — the ember theme is solid-color only (gradients are the marketing site).
- Put long-running work in a Next.js route handler — use the BullMQ worker instead.
- Create a new "way to do page headers" — always use `PageHeader`.

---

## Adding a new mode area page

1. Create `apps/web/src/app/app/<mode>/<sub-area>/page.tsx`
2. If there's no data yet, use `ModeLandingPage` from `@/components/ui`
3. Add the route to the sidebar nav groups in `apps/web/src/app/app/layout.tsx`
4. Update `ModeBar.tsx` if the `activeWhen` function needs to cover the new path
5. Add a redirect to the route map in this doc

---

*Last updated: Apr 2026*
