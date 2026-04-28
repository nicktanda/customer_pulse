# Build spec: Assumption Mapper (Discovery)

**Instructions for the agent:** Read this whole document, implement the acceptance criteria, and run `yarn workspace web lint` and tests before you stop. `DiscoveryActivityType.assumption_map` = **3**.

---

## Product promise

From the Discover landing:

> Every insight carries **hidden assumptions**. Claude **surfaces** them and suggests **one way to test or disprove** each — so you enter Build with **eyes open**.

---

## What already exists

| Area | Location |
|------|----------|
| Prompts | `apps/web/src/app/app/discover/actions.ts` — `case 3` — JSON `{ assumptions: { assumption, why_it_matters, how_to_test }[] }` |
| Renderer | `discover/activities/[id]/page.tsx` — `AIContentBlock` `case 3` — cards per assumption |

---

## Your scope

### 1. Prompt quality

- Ask for **5–7 assumptions** (range is ok); prioritize **riskiest** first (explicit in prompt).
- Each item must have **assumption** (one sentence), **why_it_matters**, **how_to_test** (concrete, not vague).
- Encourage **falsifiable** tests (what would prove the assumption wrong?).

### 2. Activity detail UX

- Add **“Copy as Markdown table”** (assumption | why it matters | how to test) for pasting into docs.
- Add **“Print-friendly view”** — either `window.print()` with a `@media print` stylesheet section **or** a dedicated collapsible “Print view” with stripped chrome (client component is fine).
- **Confidence tag** (optional enhancement): ask Claude for `risk_level: "high" | "medium" | "low"` per row — if added, extend JSON and renderer with badges; **existing rows** without `risk_level` must render fine.

### 3. PM workflow

- In the **findings** panel (right side), add short placeholder text: e.g. “Record what you learned from testing each assumption…”
- If **mark complete** is pressed with empty findings, allow it but show a one-time toast or inline hint (optional — Bootstrap alert is enough).

### 4. Insight page tie-in (light touch)

- On `discover/insights/[id]/page.tsx`, if there is an **assumption_map** activity **in progress**, show a small badge “Assumptions in flight” in the activity list row (optional if timeboxed).

---

## Acceptance criteria

- [ ] New assumption-map activities draft and render without layout break.
- [ ] **Copy as Markdown table** works on modern browsers.
- [ ] Print path produces readable output for the assumption list.
- [ ] Prompt improvements don’t break JSON parsing; fence-stripping still works.
- [ ] No regressions for other activity types.
- [ ] `yarn workspace web lint` passes.

---

## Files you will likely touch

- `apps/web/src/app/app/discover/actions.ts`
- `apps/web/src/app/app/discover/activities/[id]/page.tsx`
- Possibly `discover/insights/[id]/page.tsx` for badge
- `apps/web/src/app/globals.css` — `@media print` rules scoped to a class name

---

## Out of scope

- New DB columns.
- Linking assumptions to Jira/Linear tickets.

---

## References

- [`../2026-04-25/07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md)
