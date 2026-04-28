# Build spec: Survey Builder (Discovery)

**Instructions for the agent:** Read this whole document, implement the acceptance criteria, and run `yarn workspace web lint` plus tests before you stop. Keep `DiscoveryActivityType.survey` = **2** unchanged.

---

## Product promise

From the Discover landing:

> Get a short **5-question survey** aimed at the affected users to **quantitatively confirm** the insight. **Edit and export before sending.**

---

## What already exists

| Area | Location |
|------|----------|
| Prompts | `apps/web/src/app/app/discover/actions.ts` — `buildDraftPrompts` `case 2` — JSON shape `{ questions: { question, type, options? }[] }` with types `likert`, `multiple_choice`, `open_ended` |
| Renderer | `apps/web/src/app/app/discover/activities/[id]/page.tsx` — `AIContentBlock` `case 2` |
| Create flow | `discover/insights/[id]/new/page.tsx` — `activityTypeInfo(2)` |

---

## Your scope

### 1. Prompt alignment

- Enforce **exactly 5 questions** in the prompt (match landing copy), unless you find a strong reason — if you change count, update **landing** `FEATURES` in `discover/page.tsx` to match.
- Require **at least one** `likert`, **at least one** `open_ended`, and the rest sensible mix; Likert questions should include **scale label** in the question text (e.g. “1 = strongly disagree … 5 = strongly agree”) or add optional `scale_min_label` / `scale_max_label` fields — if you extend JSON, update the **renderer** and keep backward compatibility for existing rows (fallback to today’s display).

### 2. “Edit and export before sending”

Implement on the activity detail page for **type 2**:

- **Export** button(s):
  - **Copy as plain text** — human-readable survey (numbered, with types and options listed).
  - **Copy as Markdown** — same content, markdown formatted (suitable for Notion/Confluence).
  - Optional: **Download `.txt`** via blob in a tiny client component — nice-to-have if quick.
- PM **editing**: do **not** overload the `findings` field for structured question edits. Prefer a **server action** (e.g. `updateSurveyDraftAction`) that only runs for **activity type 2**, validates the JSON shape (Zod or hand-rolled), and writes the updated object to **`ai_generated_content`** via `updateDiscoveryActivity`. Keep `ai_generated: true`; you may add `{ human_edited: true }` inside the JSON if useful.
- Pick the **smallest** UX that lets a PM fix typos before export: **inline editable fields** (controlled component) + **Save** calling that server action.

### 3. UX polish

- Show **preview** card: “This is what participants will see” using read-only styling.
- Ensure **mobile** layout: stacked panels already; export buttons must not overflow.

### 4. Tests

- Unit-test a **serializeSurveyToText / serializeSurveyToMarkdown** helper if extracted.

---

## Acceptance criteria

- [ ] Claude draft still saves valid JSON; broken JSON shows recovery UX (same pattern as interview guide).
- [ ] **Five** questions per spec (prompt + validation after parse — if Claude returns wrong count, either retry once or show “Regenerate”).
- [ ] User can **edit** question text (and options where applicable) and **save** to DB without breaking the detail view.
- [ ] **Copy plain text** and **Copy Markdown** both work.
- [ ] Other activity types unchanged.
- [ ] `yarn workspace web lint` passes.

---

## Files you will likely touch

- `apps/web/src/app/app/discover/actions.ts` — prompts + new `updateSurveyAiContentAction` or generic `updateDiscoveryAiContentAction` restricted to type 2 + Zod validation
- `apps/web/src/app/app/discover/activities/[id]/page.tsx` — survey panel + client exports
- `apps/web/src/app/app/discover/page.tsx` — only if copy count changes
- Optional: `apps/web/src/lib/discovery-survey.ts` — pure formatters

---

## Out of scope

- Google Forms API integration.
- Anonymous public survey hosting.
- Schema migration **unless** you and the team agree a new column is required — prefer updating existing JSON.

---

## References

- [`../2026-04-25/07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md)
