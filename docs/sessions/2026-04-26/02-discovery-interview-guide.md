# Build spec: Interview Guide Generator (Discovery)

**Instructions for the agent:** Read this whole document, implement the acceptance criteria, and run `yarn workspace web lint` plus `yarn test` (or at least web-related tests) before you stop. Do not change integer enum values in `packages/db/src/enums.ts` without an explicit migration plan.

---

## Product promise (what we’re shipping toward)

From the Discover landing page:

> Claude reads the insight evidence and drafts a set of **open-ended interview questions** tailored to the specific problem. **Paste into your scheduling tool and go.**

`DiscoveryActivityType.interview_guide` = **1**.

---

## What already exists (do not remove)

| Area | Location |
|------|----------|
| Create activity (type 1) | `apps/web/src/app/app/discover/insights/[id]/new/page.tsx` — copy in `activityTypeInfo(1)` |
| Claude prompts | `apps/web/src/app/app/discover/actions.ts` — `buildDraftPrompts` `case 1` |
| Draft action | `draftActivityWithAIAction` in same file — parses JSON, saves to `ai_generated_content` |
| Detail UI | `apps/web/src/app/app/discover/activities/[id]/page.tsx` — `AIContentBlock` `case 1` renders `questions: string[]` |
| DB | `discovery_activities` — `packages/db/src/schema.ts`, queries in `packages/db/src/queries/discovery.ts` |

---

## Your scope (make it feel “shippable”)

### 1. Prompt quality (Claude)

- Keep output as **JSON only**: `{ "questions": string[] }` (same shape as today so the UI keeps working).
- Ask for **6–8 open-ended questions** (landing implies a full guide, not a tiny list). Avoid leading questions; include **1–2 warm-up / context** questions and **1 closing** question where appropriate.
- In the **user** prompt, pass enough insight context: **title, description**, and if the schema exposes it elsewhere for insights, include **insight type label** (human-readable) so questions match B2B vs UX issues, etc.
- Add one sentence in the system prompt: questions should be **paste-ready** for a calendar invite or doc (no numbering in the strings if that confuses paste — the UI already numbers with `<ol>`).

### 2. Activity detail UX

On `activities/[id]/page.tsx` for **type 1** only (extract a small child component if it keeps the file readable):

- **Copy for scheduling tools:** a button **“Copy all questions”** that copies plain text: numbered list, one question per line, suitable for email/Calendly notes. Use the Clipboard API in a **client** mini-component if needed (`"use client"`).
- **Regenerate:** if `ANTHROPIC_API_KEY` is available and activity is not `complete`, show **“Regenerate with AI”** that posts the same `draftActivityWithAIAction` form (or extend the action to allow overwrite when user confirms — your choice, but avoid silent overwrite without confirmation). Use a simple `confirm()` or a Bootstrap modal for confirmation.
- **Empty / error:** if draft was run but JSON failed to parse, show a friendly message and a **Retry** path (reuse draft action).

### 3. Env / model

- Respect existing pattern: `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` (see `callClaudeText` in `actions.ts`).
- Do not log full insight text or API keys.

### 4. Tests

- Add or extend **Vitest** tests in `apps/web` (or the most appropriate package) for **pure helpers** if you extract any (e.g. formatting questions for clipboard). If that’s too thin, add a short test for a **prompt builder** extract — optional but preferred.

---

## Acceptance criteria (checklist)

- [ ] New activities of type **1** still create and redirect to the activity detail page.
- [ ] **Draft with AI** still produces renderable questions in the left panel.
- [ ] **Copy all questions** produces a numbered plain-text block in the clipboard.
- [ ] **Regenerate** (with confirmation) replaces `ai_generated_content` and sets `ai_generated` appropriately.
- [ ] No regressions for other activity types (2–7).
- [ ] `yarn workspace web lint` passes.

---

## Files you will likely touch

- `apps/web/src/app/app/discover/actions.ts`
- `apps/web/src/app/app/discover/activities/[id]/page.tsx`
- Possible new: `apps/web/src/components/discovery/InterviewGuidePanel.tsx` (client + server split as needed)
- `apps/web/src/app/globals.css` — only if you need minimal utility classes

---

## Out of scope

- Changing DB schema or enum integers.
- Moving Claude calls to the worker (optional future).
- Full rich-text editing of individual questions (PM can edit in findings textarea for now).

---

## References

- Product context: [`../2026-04-25/07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md) — activity types, states.
- AI pipeline skill (if you change worker or large prompt strategy): `.claude/skills/ai-feedback-pipeline/SKILL.md` — *this task stays in the web app unless you explicitly move it.*
