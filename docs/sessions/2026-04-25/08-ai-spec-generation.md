# AI Spec Generation — Design & Implementation

> Session: Sat 25 Apr 2026

---

## What we're building

When a PM hits **"Create spec"**, Claude automatically drafts a complete product spec — not just a title + blank box. The output follows the same structured process Anthropic uses internally for spec.md documents:

- **Problem statement** — who is affected and why this matters
- **User stories** — 3–5 "As a X, I want Y so that Z" stories
- **Acceptance criteria** — Given/When/Then conditions per story
- **Success metrics** — measurable outcomes (percentages, counts, time bounds)
- **Out of scope** — explicit exclusions to prevent scope creep
- **Risks & edge cases** — what could go wrong

Claude reads the linked insight(s) evidence and customer feedback to ground every section in real data — no invented requirements.

---

## Current state (what existed before this change)

| Piece | File | What it did |
|-------|------|-------------|
| Create form | `specs/new/page.tsx` | Title + description textarea + insight multi-select |
| Server action | `build/actions.ts` `createSpecAction` | Validates title, inserts spec row, links insights |
| Spec table | `packages/db/src/schema.ts` | Had `user_stories`, `acceptance_criteria` (jsonb), `description`, `ai_generated` |
| Query helpers | `packages/db/src/queries/specs.ts` | `createSpec`, `linkSpecToInsights`, `getSpecsByProject` |

**Gaps this addresses:**

1. `user_stories` and `acceptance_criteria` always saved as empty arrays — AI drafting was planned (Phase 5 in `03-build-plan.md`) but never wired up
2. No `success_metrics`, `out_of_scope`, or `risks` columns — spec was structurally incomplete
3. No spec detail page — redirect after create went to a 404
4. No web-side Anthropic helper — only `apps/worker/src/ai/call-claude.ts` existed

---

## New user flow

```
[/app/build/specs/new]
   │
   ├── PM fills in: Title (required), Description (optional)
   ├── PM selects linked insight(s) — pre-selected if ?from_insight= is set
   │
   └── PM clicks "Create spec"
          │
          ├── Server action validates title
          │
          ├── Fetches linked insight rows from DB
          │   └── description, insightType, severity, evidence[], feedbackCount
          │
          ├── Calls Claude (claude-sonnet-4) with spec-generation prompt
          │   └── ~3–8 second wait shown as "Drafting your spec with AI..."
          │
          ├── Claude returns structured JSON:
          │   { problemStatement, userStories[], acceptanceCriteria[],
          │     successMetrics[], outOfScope[], risks[] }
          │
          ├── Spec row inserted with all AI-generated fields populated
          │   └── ai_generated = true
          │
          ├── spec_insights join rows created
          │
          └── Redirect → /app/build/specs/[id]
                 └── Detail page shows full draft with "AI Drafted" badge
                     PM can review — editing comes in Day 2
```

When no insights are linked, Claude drafts from the title + description alone (still useful for manually started specs).

---

## Claude prompt design

### System prompt

```
You are a product spec writer. You receive a spec title, description, and optional customer insight evidence.
Write a complete product spec as a single JSON object.

Output format (return ONLY valid JSON, no prose outside it):
{
  "problemStatement": "2–3 sentences: who is affected, what the problem is, why it matters now",
  "userStories": [
    "As a [persona], I want [specific goal] so that [concrete benefit]"
  ],
  "acceptanceCriteria": [
    "Given [starting context] when [user action or system event] then [expected outcome]"
  ],
  "successMetrics": [
    "Measurable outcome with a number and time bound, e.g. '20 % of active users use the feature within 30 days'"
  ],
  "outOfScope": [
    "Explicit item this spec does NOT include, e.g. 'Bulk export across all projects'"
  ],
  "risks": [
    "Concrete risk or edge case, e.g. 'Large exports may time out for projects with >10k feedback items'"
  ]
}

Rules:
- Produce 3–5 user stories.
- Produce 1–2 acceptance criteria per user story (so 3–10 total).
- Produce 2–4 success metrics — each must be measurable.
- Produce 2–4 out-of-scope items — be explicit to prevent scope creep.
- Produce 2–3 risks.
- Ground every claim in the provided evidence — never invent data.
- If no evidence is provided, use the title and description only — still follow the format.
- Respond ONLY with the JSON object.
```

### User message shape

```
Spec title: {title}

{description if provided}

{if insights linked:}
--- Customer evidence ---
{for each insight:}
Insight: {title}
Type: {insightTypeLabel} | Severity: {severityLabel} | Affected users: {n} | Feedback items: {n}
Summary: {description}
Evidence snippets:
- {evidence[0]}
- {evidence[1]}
...
```

---

## DB schema additions

Three new nullable JSONB columns on the `specs` table:

| Column | Type | Purpose |
|--------|------|---------|
| `success_metrics` | `jsonb` (string[]) | Measurable success criteria generated by Claude |
| `out_of_scope` | `jsonb` (string[]) | Explicit exclusions to prevent scope creep |
| `risks` | `jsonb` (string[]) | Risks and edge cases identified during drafting |

These default to `[]` (empty array) so they are safe for existing rows.

### Drizzle schema (packages/db/src/schema.ts)

```typescript
successMetrics: jsonb("success_metrics").$type<string[]>().notNull().default([]),
outOfScope:     jsonb("out_of_scope").$type<string[]>().notNull().default([]),
risks:          jsonb("risks").$type<string[]>().notNull().default([]),
```

### Safe SQL (packages/db/sql/ensure_spec_ai_columns.sql)

```sql
ALTER TABLE specs
  ADD COLUMN IF NOT EXISTS success_metrics jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS out_of_scope    jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS risks           jsonb NOT NULL DEFAULT '[]';
```

Apply with: `psql $DATABASE_URL -f packages/db/sql/ensure_spec_ai_columns.sql`

---

## Architecture changes

### 1 · Web-side Anthropic helper (`apps/web/src/lib/claude.ts`)

Mirrors `apps/worker/src/ai/call-claude.ts` but uses `getRequestDb()` (the per-request Next.js DB pool) for the API key DB fallback:

- `resolveWebApiKey(db)` — checks `ANTHROPIC_API_KEY` env var, falls back to Anthropic integration row in DB (source_type 13)
- `callClaudeWeb({ system, user, maxTokens })` — direct Anthropic HTTP call, returns `{ text, ok }`
- `callClaudeJsonWeb<T>(...)` — parses JSON from text response, uses `parseJsonFromText` logic

### 2 · Updated `createSpecAction` (apps/web/src/app/app/build/actions.ts)

Replace the simple insert with a two-step flow:

1. Validate title (redirect with `?error=required` if empty)
2. Fetch linked insights from DB (up to 5, ordered by severity desc)
3. Build Claude user message from title + description + insight evidence
4. Call `callClaudeJsonWeb<SpecDraft>()` with the spec-generation system prompt
5. Insert spec row with `userStories`, `acceptanceCriteria`, `successMetrics`, `outOfScope`, `risks`, `aiGenerated: true` populated from Claude response
6. Fall back gracefully if Claude fails — insert spec with empty arrays, `aiGenerated: false`
7. Link insights, revalidate, redirect to `/app/build/specs/[newId]`

### 3 · Loading state on the create form

The submit button becomes a small client component (`SpecSubmitButton`) using `useFormStatus` from `react-dom`:

- Default label: **"Create spec"**
- While pending: spinner + **"Drafting with AI…"**
- Helper text under button: "Claude will draft user stories, acceptance criteria, and success metrics automatically."

### 4 · Spec detail page (`apps/web/src/app/app/build/specs/[id]/page.tsx`)

Server component. Sections rendered:

| Section | Rendered as |
|---------|-------------|
| Title + status badge | `PageHeader` with `<span>` pill |
| "AI Drafted" badge | amber `badge` inline with title (if `aiGenerated`) |
| Problem statement | Lead paragraph (larger text) |
| Description | `<p>` block |
| User stories | Numbered `<ol>` |
| Acceptance criteria | Checklist-style `<ul>` with checkbox icons |
| Success metrics | `<ul>` with chart icon prefix |
| Out of scope | `<ul>` with ✗ prefix |
| Risks | `<ul>` with warning icon prefix |
| Linked insights | Chips linking to `/app/learn/insights/[id]` |

Empty-array sections are hidden (not rendered at all) to avoid showing empty headings.

---

## Files created / modified

| File | Change |
|------|--------|
| `packages/db/src/schema.ts` | Add `successMetrics`, `outOfScope`, `risks` columns to `specs` table |
| `packages/db/sql/ensure_spec_ai_columns.sql` | **New** — safe `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| `packages/db/src/queries/specs.ts` | Add `CreateSpecAiInput` type, update `createSpec` to accept AI fields, add `getSpecById` |
| `apps/web/src/lib/claude.ts` | **New** — web-side Anthropic helper (`resolveWebApiKey`, `callClaudeWeb`, `callClaudeJsonWeb`) |
| `apps/web/src/app/app/build/actions.ts` | Rewrite `createSpecAction` to call AI before inserting |
| `apps/web/src/app/app/build/specs/new/page.tsx` | Extract `SpecSubmitButton` client component for loading state |
| `apps/web/src/app/app/build/specs/[id]/page.tsx` | **New** — spec detail page |

---

## Build order

### Step 1 — DB schema (no risk, additive only)
1. Add three columns to `packages/db/src/schema.ts`
2. Write and apply `ensure_spec_ai_columns.sql`
3. Update `packages/db/src/queries/specs.ts` — `CreateSpecAiInput`, `getSpecById`

### Step 2 — Web Claude helper
1. Create `apps/web/src/lib/claude.ts`
2. Verify it can resolve the API key (same path as worker)

### Step 3 — AI drafting server action
1. Rewrite `createSpecAction` in `build/actions.ts`
2. Test with a linked insight that has evidence — check the Claude response shape

### Step 4 — UI updates
1. Add `SpecSubmitButton` client component to `specs/new/page.tsx`
2. Create `specs/[id]/page.tsx` — renders all sections, handles missing/empty gracefully

---

## Edge cases and constraints

| Case | Handling |
|------|----------|
| Claude call fails or times out | Fall back: spec saved with empty arrays, `aiGenerated: false`. No error shown to user (silent degradation). |
| Claude returns invalid JSON | `callClaudeJsonWeb` returns `null`; same fallback as above. |
| No insights linked, no description | Claude drafts from title alone — quality will be lower but still useful as a starting skeleton. |
| Insight has no evidence array | Evidence section omitted from Claude context; not an error. |
| Spec title is very short (e.g. "CSV export") | Claude will infer context; the problem statement section will be short but present. |
| User creates many specs quickly | Each create is a synchronous Anthropic call (~3–8s). No queue — acceptable for a PM tool used by a small team. Add BullMQ if volume grows. |
| `ai_generated = false` (manual spec) | Detail page shows no "AI Drafted" badge; empty sections are hidden, not shown as "(none)". |

---

## Open questions

1. **Editing** — the spec detail page (Day 2) should allow editing each section inline. Should edits clear the "AI Drafted" badge? Probably yes — once a human edits a story, it's no longer purely AI content.
2. **Re-draft** — should a "Re-draft with AI" button appear on the detail page to regenerate sections? Defer to Day 2.
3. **Token cost** — the spec prompt with 3–5 insights generates ~3k–4k tokens. At claude-sonnet-4 pricing this is ~$0.01 per spec. Acceptable; log token usage if it grows.
4. **Streaming** — the 3–8s wait could be improved with streaming (SSE). Defer; synchronous is simpler and sufficient for a PM tool.

---

*Customer Pulse — Build mode AI spec generation, Sat 25 Apr 2026*
