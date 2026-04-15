---
name: reusable-ui-components
description: >-
  Prefer extracting shared React UI into reusable components in apps/web when the
  same pattern appears twice, crosses routes, or forms a clear boundary (layout
  chrome, forms, tables, empty states). Use when building or refactoring Next.js
  pages under apps/web, especially with ship-next-feature work.
---

# Reusable UI components (Customer Pulse)

This skill steers UI work toward **small, composable components** so the app stays consistent and easier to change. It applies to **`apps/web`** (Next.js 15, App Router), alongside **`ship-next-feature`**.

## When to extract a component

**Do extract** when any of these is true:

- The same JSX structure (or nearly the same, differing only by props) appears in **two or more** places.
- A block is **large or complex** enough that a named component improves readability—even if used once today—*and* it has a clear responsibility (e.g. “feedback row”, “integration status badge”).
- The UI is **app-wide chrome** (page shell, headers, nav patterns, form footers, pagination): prefer **`apps/web/src/components/ui/`** so every screen matches existing patterns like `PageShell`, `PageHeader`, `FormActions`.

**Avoid over-abstracting** when:

- The snippet is a **one-off** and a second use is unlikely.
- Extraction would require **many optional props** or boolean flags (“mode soup”); keep one focused component per variant or use composition (children, slots) instead.

## Where to put files

| Kind of UI | Typical location |
|------------|------------------|
| Shared across many `/app/...` routes, layout/forms/lists | **`apps/web/src/components/ui/`** — re-export from **`apps/web/src/components/ui/index.ts`** when it is a general building block. |
| Specific to one feature area but reused within it | **`apps/web/src/components/<feature>/`** (e.g. feedback-specific cards) or a **`components/`** folder next to the route segment if the team already uses colocation there. |
| Client-only interactivity | **`"use client"`** at the top of **that** file; keep parent **server components** when possible (see **`ship-next-feature`**). |

## How to build the component

1. **Name by purpose**, not by page: e.g. `FeedbackSourceBadge` not `IntegrationsPageBadge`.
2. **Type props explicitly** (TypeScript `type` or `interface`); prefer **`ReactNode`** for `children` when composition fits.
3. **Match existing styling**: Bootstrap / react-bootstrap + Tailwind patterns already on neighboring pages; reuse utility classes and structure from **`@/components/ui`** where applicable.
4. **Compose**: prefer `children` or small subcomponents over giant prop lists.
5. After adding or moving components, run **`yarn workspace web lint`** (and tests if behavior is non-trivial).

## Mental checklist before finishing a page

- Did I copy-paste a chunk that already exists elsewhere? → **Extract and reuse.**
- Is this block likely to appear on another route soon? → **Extract now** to avoid drift.
- Am I inventing a third way to do page titles or form actions? → **Use or extend `PageHeader` / `FormActions` (or similar) instead.**

## Related skills

- **`ship-next-feature`** — route structure, server vs client, Auth.js, where app pages live.
- **`product-ui-pr-review`** — user-visible consistency and copy when components affect UX broadly.
