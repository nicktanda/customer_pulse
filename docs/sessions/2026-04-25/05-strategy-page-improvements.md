# Strategy Page — UX/UI Improvement Plan

**Date:** Saturday 25 April 2026
**File:** `apps/web/src/app/app/strategy/page.tsx`
**Scope:** Presentation layer only — no changes to `actions.ts`, DB schema, or server actions.

---

## What's wrong today

The strategy page has two plain stacked cards with no visual hierarchy, cramped forms, and no design polish. Specific issues:

| Problem | Detail |
|---------|--------|
| **Cramped "Add team" form** | Team name, objectives, strategy, and "Add" button are forced into a single Bootstrap grid row (`col-md-3 / col-md-4 / col-md-4 / col-md-1`). The textareas are 2 rows tall and the "Add" button is a tiny outline pill. There's no room to type. |
| **Teams display vertically flat** | Each team renders directly as an edit form in a rounded box with no visual header. The team name is just an input — nothing reads as "this is a named entity". |
| **No icons** | Lucide icons are installed and used throughout the app (Integrations, etc.) but strategy uses none. Headings and section labels are purely typographic. |
| **Read-only view is featureless** | Non-editors see objectives and strategy as plain `<p>` tags in a small font. No structure, no labels, no visual weight. |
| **No empty state design** | Teams empty state is one line of muted text: "No teams yet." No icon, no direction, no visual intention. |
| **Sections have no count or metadata** | The Teams section heading gives no indication of how many teams exist. |
| **Business strategy form: two equal-weight fields** | Objectives and Strategy are stacked with no typographic differentiation despite being hierarchically different (objectives are the *what*, strategy is the *how*). |
| **Delete button mixes into the edit form** | "Remove team" sits immediately below the Save button in the same form area, making destructive and save actions visually adjacent. |
| **Card contrast** | Global dark-mode fix (`--bs-secondary-bg` on cards) is in place, but the strategy page adds `border-secondary-subtle shadow-sm` inconsistently — teams use `bg-body-secondary bg-opacity-25` on list items instead. |

---

## Design principles applied

These come from `docs/design.md` and `docs/sessions/2026-04-25/04-design-overhaul-brief.md`:

1. **Cards must float** — cards get `border-secondary-subtle shadow-sm` consistently.
2. **Hierarchy through size and weight** — section labels use `.mode-section-label` (small-caps), headings use `fw-semibold`.
3. **Icons in headings** — use Lucide `Target` for Business Strategy and `Users` for Teams (16 px, `text-body-secondary`, 0.85 opacity).
4. **Status/count always has a badge** — team count shown as `<span class="badge text-bg-secondary">` next to the Teams heading.
5. **Empty space needs intention** — empty team state gets a Lucide icon + heading + short copy instead of a plain sentence.
6. **Destructive actions are visually separated** — delete button is moved outside the edit form block and given visual distance via `mt-3 pt-3 border-top`.

---

## Section-by-section changes

### 1. Page header

**Before:** Plain description paragraph.
**After:** Keep description but make the project name `fw-semibold` — already done for the page header. No further change needed here.

---

### 2. Business Strategy section

**Before:**
- One card with a plain `<h2 class="h5">` and two stacked full-width textareas.
- "Save business strategy" button with no icon.
- Read-only view: two small `<p>` tags.

**After:**
- Section header row: Lucide `Target` icon (16 px, muted) + heading + `.mode-section-label` kicker ("Company layer").
- **Edit mode:** Textareas stay full-width but get `rows={5}` (was 4) and a `form-label` with heavier weight (`fw-semibold`). The save button gets a Lucide `Save` icon prefix.
- **Read-only display:** Objectives and Strategy each get a labeled card-style block:
  ```
  ┌─────────────────────────────────────┐
  │  OBJECTIVES                          │  ← .mode-section-label
  │  <prose text>                        │
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │  STRATEGY                            │
  │  <prose text>                        │
  └─────────────────────────────────────┘
  ```
  These use `bg-body-secondary rounded p-3` so they float visually.

---

### 3. Teams section heading

**Before:** `<h2 class="h5">Teams</h2>` + plain description.
**After:**
- Flex row: Lucide `Users` icon + `Teams` heading + team count badge (`text-bg-secondary`).
- Description kept, slightly shorter.

---

### 4. Add team form

**Before:** Crammed inline Bootstrap row — 4 columns side by side, 2-row textareas, tiny "Add" button.
**After:**
- Separate "Add a team" collapsible sub-card inside the Teams card. A bordered `<details>`/div with its own heading.
- Layout: Team name as a full-width input on its own row; Objectives and Strategy in a `row g-3` (2 columns, `col-md-6` each) with proper `rows={4}`.
- "Add team" button uses `btn btn-primary` with a Lucide `Plus` icon prefix — ember colour, visible.

---

### 5. Team cards

**Before:** Each team is a `<li class="border rounded p-3 bg-body-secondary bg-opacity-25">` with the edit form directly inside. No team header.
**After:**
- Each team gets a **header row**: a small circle avatar with the team's first letter (ember background, white text) + team name as `fw-semibold` text.
- Edit form fields below the header, same columns as the add form (name full-width, objectives + strategy 2-column).
- "Save team" button: `btn btn-sm btn-primary` with `Save` icon.
- "Remove team": moved below a `border-top mt-3 pt-2` divider, styled as `btn btn-sm btn-outline-danger` (more visible than link, less prominent than primary).
- Read-only view: uses the same labeled block pattern as the business strategy read-only — `bg-body-secondary rounded p-3` blocks for each field.

---

### 6. Empty team state

**Before:** `<li class="text-body-secondary small">No teams yet. Add one above.</li>`
**After:** A styled empty state card with:
- Lucide `Users` icon (24 px, muted, centered)
- Heading: "No teams yet"
- Body: "Add a team below to define a slice of the organisation — each team gets its own objectives and strategy."
- Inline with the card-body so it feels intentional, not like a missing feature.

---

## Files changed

| File | Change |
|------|--------|
| `apps/web/src/app/app/strategy/page.tsx` | All visual changes (no logic changes) |

No `globals.css` additions needed — all patterns use existing Bootstrap utilities, Tailwind utilities, and CSS custom properties already defined.

---

## What is NOT changing

- `apps/web/src/app/app/strategy/actions.ts` — no mutations touched
- DB schema / Drizzle queries — no data model changes
- Routes or navigation — strategy stays in the Learn → Build → Monitor sidebar

---

## Verification

After implementation:
- [ ] `yarn workspace web lint` passes
- [ ] Light mode: cards float off the background; section headings are clearly hierarchical
- [ ] Dark mode: same — cards use `--bs-secondary-bg`
- [ ] Edit mode: add-team form has breathing room; each textarea is usable
- [ ] Teams list: each card has a readable header with team name; delete is visually separated
- [ ] Empty state looks intentional, not like a broken page
- [ ] Read-only mode: both business strategy and team fields render with labeled blocks

---

*Plan generated Sat 25 Apr 2026*
