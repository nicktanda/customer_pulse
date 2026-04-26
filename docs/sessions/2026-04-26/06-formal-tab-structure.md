# Build spec: Formal tab structure (Reporting first)

**Instructions for the agent:** Read this whole document. Implement a **reusable** tab component and migrate the Reporting page to it. Run `yarn workspace web lint` and verify Reporting still works in the browser (both tabs, both time ranges). Follow existing Bootstrap + CSS variable patterns in `apps/web/src/app/globals.css`.

---

## Problem

Reporting uses Bootstrap `nav nav-tabs` via `ReportingTabBar.tsx`. **Inactive** tabs look visually weak compared to **active**, and the **Ask AI** tab uses inline styling (sparkle) that doesn’t match a cohesive system. Other pages will need tabs later — we want **one pattern**.

---

## Goals

1. **Visual system** — Active tab: clear filled or underline treatment consistent with **mode bar** / **ember** accent (`globals.css` already defines primary tokens). Inactive: readable hover/focus. **Keyboard:** focus rings visible.
2. **Reusable API** — A single component (or pair: shell + link item) that accepts an array of `{ id, label, href, variant?: "default" | "accent" }`.
3. **Reporting migration** — Replace `ReportingTabBar` usage with the new component; URLs stay **`?tab=overview|ask&range=N`** (no breaking bookmark changes).
4. **Accessibility** — `role="tablist"` / `role="tab"` **only if** you implement proper `aria-selected` and keyboard navigation **or** keep **links** as today (recommended v1: **links** with `aria-current="page"` on active — matches current behaviour). Document choice in component JSDoc.

---

## Non-goals (v1)

- Radix/shadcn port.
- Client-side tab panels without URL change (Reporting is server-rendered per tab).

---

## Implementation sketch (you may adjust)

- Add `apps/web/src/components/ui/AppTabBar.tsx` (name flexible — pick something consistent with `ModeBar`).
- Props example:

  ```ts
  type AppTabItem = {
    id: string;
    label: React.ReactNode;
    href: string;
    /** Accent tab (e.g. AI) — subtle differentiator, still looks “inactive” when not selected */
    accent?: boolean;
  };
  ```

- Implementation detail: use `next/link` + `usePathname`/`useSearchParams` **or** keep Reporting as pure server: pass **`activeId`** from `reporting/page.tsx` (current pattern). **Prefer server-first:** parent passes `activeTab` string, children are links — no client hook required for Reporting.
- Styles: add BEM-like class names, e.g. `.app-tab-bar`, `.app-tab-bar__link`, `.app-tab-bar__link--active`, `.app-tab-bar__link--accent`, in `globals.css` under a short comment block **“App tab bar (shared)”**. Use CSS variables: `var(--bs-body-bg)`, `var(--bs-border-color)`, primary rgb for accent.

- **Ask AI** tab: keep sparkle as optional `label` node or `accent` flag; ensure **inactive accent** tab still has border or opacity treatment so it doesn’t look like plain text.

---

## Acceptance criteria

- [ ] Reporting page shows **Overview** and **Ask AI** with **improved** visual parity between states (active clearly selected; inactive not “broken”).
- [ ] Tab links preserve **`range`** and **`tab`** query params exactly as today.
- [ ] No new lint errors; TypeScript strict OK.
- [ ] Component lives under `components/ui/` and is exported from `@/components/ui` **if** there is a barrel file — match existing export pattern in `apps/web/src/components/ui/index.ts`.
- [ ] Short JSDoc on the component explaining how to add a third tab later.

---

## Files you will likely touch

- `apps/web/src/components/ui/AppTabBar.tsx` *(new)*
- `apps/web/src/components/ui/index.ts` *(if barrel exists)*
- `apps/web/src/components/reporting/ReportingTabBar.tsx` — **thin wrapper** re-exporting AppTabBar with Reporting-specific items **or** delete and inline in `reporting/page.tsx` — prefer thin wrapper to minimize page diff.
- `apps/web/src/app/globals.css`
- `apps/web/src/app/app/reporting/page.tsx` — only if imports change

---

## Verification

- Click **Overview** ↔ **Ask AI** with **7 / 30 / 90** day ranges; confirm URL and content match.
- Keyboard: Tab to links, Enter navigates.
- Dark theme: contrast acceptable (Reporting is dark-mode oriented).

---

## References

- Current implementation: `apps/web/src/components/reporting/ReportingTabBar.tsx`
- Mode bar styling reference: `apps/web/src/components/ModeBar.tsx` + related CSS in `globals.css`
- UI skill: `.claude/skills/reusable-ui-components/SKILL.md`
- Ship-next-feature: `.claude/skills/ship-next-feature/SKILL.md`
