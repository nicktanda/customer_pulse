# AI native roadmap

This document describes **where Kairos uses AI today**, what **“more AI native”** means for this product, and a **practical roadmap** of app and platform changes. It is a planning artifact, not a commitment to build order.

---

## What “AI native” means here

**Today:** AI runs mostly in the **worker** (classification, insight pipeline, digest copy, reporting assistant). The **web app** is still organized like a classic PM tool: tables, filters, forms, and an “AI summary” block on feedback.

**AI native (target posture):** The product still stores authoritative data in Postgres and respects permissions, but the **primary experience** becomes *asking, comparing, and acting on signals*—with the model **grounded** on allowlisted facts, **citations** to rows users can open, and **human approval** before anything irreversible (status changes, outbound messages, ticket creation).

---

## Current capabilities (baseline)

| Area | What exists | Where to look |
|------|-------------|----------------|
| Per-feedback classification | Category, priority, short summary; optional alignment to project business objectives | `apps/worker/src/ai/feedback-processor.ts`, `process_feedback` in `apps/worker/src/job-handlers.ts` |
| Batch classification | Scheduled batch job | `ProcessFeedbackBatchJob` in `apps/worker/src/schedules.ts` |
| Insight → theme → idea pipeline | Daily full pipeline; weekly themes; attack groups | `apps/worker/src/ai/orchestrator.ts`, `GenerateInsightsJob` / `WeeklyThemeAnalysisJob` / `BuildAttackGroupsJob` |
| Daily digest | Aggregates + short AI “themes” when API key present | `SendDailyPulseJob` in `apps/worker/src/job-handlers.ts`, `apps/worker/src/mail/templates/pulse-report.ts` |
| Ask the data | NL Q&A and chart mode over a **bounded JSON context** (no full raw dump) | `apps/worker/src/reporting-nl.ts`, `apps/web/src/components/reporting/ReportingNlAssistant.tsx`, `apps/web/src/app/api/app/reporting/ask/route.ts` |
| Feedback UI | List, filters, bulk triage, detail with AI summary + reprocess | `apps/web/src/app/app/feedback/`, `apps/web/src/components/feedback/FeedbackDetailBody.tsx` |

---

## Principles (do not skip)

1. **Grounding:** Prefer patterns like `buildReportingContextBundle`—aggregates, capped snippets, stable IDs—over sending unlimited feedback text to the model.
2. **Trust:** Every narrative that can influence decisions should **link to evidence** (feedback IDs, insight IDs, pulse period).
3. **Privacy / PII:** Do not log full prompts or responses when they contain customer content; align with `.claude/skills/security-pii-review` and `.claude/skills/ai-feedback-pipeline` before expanding logging or observability.
4. **Failures are normal:** API errors, timeouts, and malformed JSON already matter in workers; any new AI surface needs the same **degraded UX** (clear message, retry, never silent wrong data).

---

## Roadmap (phased)

Phases are ordered by **dependency** and **risk**. You can parallelize items within a phase where noted.

### Phase 1 — Surface intelligence without new model capabilities

**Goal:** Make existing AI outputs impossible to miss and easier to act on.

| Change | Why |
|--------|-----|
| **Dashboard “signal” cards** | Summarize last-7d / last-30d deltas using data you already store (counts, top themes, recent insights)—optional short model copy only after aggregates are correct. |
| **Cross-link UI** | From a feedback row, deep-link to related insights/themes if relations exist in DB; from insight detail, prominent links back to feedback. Reduces tab-hopping. |
| **Empty / stale states** | When `aiSummary` or pipeline outputs are missing, explain *why* (no key, worker down, not yet processed) and offer **Reprocess** where you already do on detail. |
| **Reporting assistant UX** | Progress, cancel, clearer “what data was used” (IDs/time window)—see historical UX notes under `docs/archive/plans/cursor/`. |

*Mainly `apps/web`; may reuse worker endpoints or add small read APIs.*

### Phase 2 — Conversational layer outside Reporting

**Goal:** Same “ask grounded questions” capability as `reporting_nl`, routed from more pages.

| Change | Why |
|--------|-----|
| **Shared “Ask Kairos” entry point** | Reuse the reporting ask/poll flow (or extract a shared hook/API) on Dashboard and optionally Feedback list (scoped prompt: “explain this filter”). |
| **Scoped context builders** | New small builders parallel to `buildReportingContextBundle`: e.g. “current list query + totals + 12 snippets” so the model cannot see the whole project blindly. |
| **Streaming (optional)** | Improves perceived latency for long answers; requires API and UI changes—do after patterns stabilize. |

*Touches `apps/web` (components, routes), `apps/worker/src/reporting-nl.ts` (or a factored module), queue names must stay in sync (`apps/web/src/lib/queue-names.ts` vs `apps/worker/src/queue-names.ts`).*

### Phase 3 — Proactive and triage copilot

**Goal:** AI suggests; humans confirm—especially for writes.

| Change | Why |
|--------|-----|
| **Spike / cluster detection** | Simple statistical triggers first (volume by day, category); model only narrates *after* numbers are computed—keeps hallucination risk low. |
| **Suggested triage** | For selected rows: proposed category/status/priority as **draft chips**; apply only on explicit confirm (extends bulk patterns in `apps/web/src/app/app/feedback/`). |
| **Duplicate / similarity (lightweight)** | Start with “same source + similar title” heuristics; later Phase 4 embeddings if needed. |

*Worker jobs or on-demand jobs + new UI states; schema changes only if you persist suggestions.*

### Phase 4 — Semantic search and merge (larger bet)

**Goal:** “Find by meaning” and deduplication—strong AI-native signal.

| Change | Why |
|--------|-----|
| **Embeddings pipeline** | Embed feedback snippets on process or on schedule; store vectors (new table or external index). |
| **Similar feedback panel** | On feedback detail: “similar items” with scores + links. |
| **Merge workflow** | Admin merge of duplicates with audit trail—product and legal sensitive; design before build. |

*New infra (cost, retention, GDPR), `packages/db`, worker jobs, possibly a vector store.*

### Phase 5 — Strategy loop and outbound actions (highest risk)

**Goal:** Close the loop from **Strategy** (`businessObjectives` / `businessStrategy`) to priorities—and optionally to **Linear** / email drafts.

| Change | Why |
|--------|-----|
| **Objective-aware briefs** | Scheduled or on-demand: “3 bets / 3 cuts” grounded in objectives + Phase 1–2 context bundles. |
| **Tool-using agents (careful)** | Only **allowlisted** tools: read-only SQL shapes, draft-only PRs/tickets, never silent send. Requires strict authz checks in the web layer and idempotent workers. |

*Cross-cuts `apps/web/src/app/app/strategy/`, worker, integrations; highest review bar.*

---

## Metrics (define early)

Pick a small set to validate each phase, for example:

- Time from login to **first useful answer** (manual stopwatch or analytics event).
- **Reprocess** queue depth and median time to `aiProcessedAt`.
- **Override rate**: when users change category/priority after AI classification (signals model quality).
- Reporting assistant: **completion rate**, **failure rate**, and qualitative feedback on trust.

---

## Out of scope (for this doc)

- Replacing Drizzle/Postgres with an LLM as source of truth.
- Sending customer content to models **without** a data-processing agreement and product disclosure where required.

---

## Related docs and skills

- `.claude/skills/ai-feedback-pipeline/SKILL.md` — changing prompts, workers, cost/failure behavior.
- `.claude/skills/ship-next-feature/SKILL.md` — App Router UI and server actions.
- `.claude/skills/security-pii-review/SKILL.md` — before shipping broader AI surfaces.
- `docs/next-migration/PARITY_MATRIX.md` — legacy parity and enum meanings when touching stored integers.

---

*Last updated: 2026-04-18 — initial roadmap from product/code review.*
