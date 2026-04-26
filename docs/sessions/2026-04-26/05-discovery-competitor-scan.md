# Build spec: Competitor Scan (Discovery)

**Instructions for the agent:** Read this whole document, implement the acceptance criteria, and run `yarn workspace web lint` and tests before you stop. `DiscoveryActivityType.competitor_scan` = **4**.

---

## Product promise

From the Discover landing:

> Find out how **2–3 comparable products** handle the same problem. Claude suggests **which competitors** to research and **what specifically to look for**.

The code today asks for **3** competitors — align copy and prompt with **2–3** (let Claude pick 2 or 3 based on relevance).

---

## What already exists

| Area | Location |
|------|----------|
| Prompts | `apps/web/src/app/app/discover/actions.ts` — `case 4` — `{ competitors: { name, things_to_check: string[] }[] }` |
| Renderer | `discover/activities/[id]/page.tsx` — `AIContentBlock` `case 4` |

---

## Your scope

### 1. Prompt quality

- Ask for **2 or 3** named competitors (not always 3). Prefer **direct** competitors + **adjacent** tools when the insight is narrow.
- Each competitor: **name**, **why_relevant** (one line), **things_to_check** (3–5 bullets as strings).
- Extend JSON shape with optional `why_relevant` per competitor — **update renderer** to show it; **old rows** without field still work.

### 2. Activity detail UX

- **Research checklist mode:** render `things_to_check` as **checkboxes** (client state only is OK — “checked” not persisted unless you want to store in `findings` as JSON — **prefer client-only** for v1 to avoid schema churn).
- **Copy checklist** as Markdown (competitor headings + task list `- [ ]`).
- Link **“Open Reporting”** is on data_query type today — for competitor scan, add a subtle **tip** link: “Compare positioning in Learn” → `/app/learn/insights` or parent insight link (already in header).

### 3. Landing + new-activity copy

- Ensure `discover/page.tsx` and `activityTypeInfo(4)` in `new/page.tsx` don’t promise “3” if we say “2–3”.

---

## Acceptance criteria

- [ ] Claude returns valid JSON with **2–3** competitors after prompt change; parser handles new optional fields.
- [ ] UI shows **why_relevant** when present.
- [ ] Checklist UX is usable and **Copy Markdown** includes unchecked list syntax.
- [ ] Existing saved activities still render.
- [ ] `yarn workspace web lint` passes.

---

## Files you will likely touch

- `apps/web/src/app/app/discover/actions.ts`
- `apps/web/src/app/app/discover/activities/[id]/page.tsx`
- `apps/web/src/app/app/discover/insights/[id]/new/page.tsx` — copy only if needed
- `apps/web/src/app/app/discover/page.tsx` — FEATURES copy if needed

---

## Out of scope

- Scraping competitor sites or screenshots.
- Automated competitor matrix PDF.

---

## References

- [`../2026-04-25/07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md)
