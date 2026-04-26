# Roadmap — Sunday 26 April 2026

**Branch:** `discovery-and-flow-improvements`  
**Theme:** tighten **Discovery** and the **Learn → Discover → Build** journey so it feels intentional, not bolted on.

This file is the day’s game plan. Check boxes as you finish items; add spin-off notes (`02-…`, `03-…`) if a topic gets big.

---

## Where we’re starting from

- **Discover** is already a fourth tab in the mode bar (`ModeBar.tsx`) with routes under `/app/discover/*` (landing, insights list, insight detail, new activity, activity detail).
- **Learn** and **Build** already share the “golden thread” (insights ↔ specs) from prior work.
- The **product spec** for Discovery lives in [`../2026-04-25/07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md) — activity types, states, and route structure.

So today is less “greenfield” and more **polish, continuity, and flow**.

---

## North star for today

By end of session, a PM should be able to:

1. **Notice** Discovery from Learn without hunting for it.  
2. **Start** validation work from an insight in one or two obvious clicks.  
3. **Understand** how Discovery connects to Build (what happens when they’re “done” validating).

Exact UI can be incremental; the **mental model** should be clear.

---

## Priority tiers

| Tier | Focus | Why |
|------|--------|-----|
| **P0** | Entry points + wayfinding | If people can’t find Discover, nothing else matters. |
| **P1** | Insight ↔ activity flow | Creating and resuming activities should feel smooth. |
| **P2** | Build handoff | Bridge from “discovery done” to spec creation (even if lightweight). |
| **P3** | Nice-to-have UX | Copy, empty states, small visual consistency — after P0–P1. |
| **P4** | **Discovery activity types** | Ship the “Coming to Discover” generators (see below) — each gets its own agent brief. |
| **P5** | **Formal tab shell** | Reusable, styled tabs (Reporting is the first place that shows the gap). |

---

## “Coming to Discover” — what we should be building

The Discover landing **Coming to Discover** list is the public backlog for validation tools. Each line item should become a **separate `.md` brief** so different agents can implement in parallel without stepping on each other.

| # | Feature | User-facing promise (from the product copy) | Agent brief *(add file at this path when splitting work)* |
|---|---------|-----------------------------------------------|--------------------------------------------------------|
| 01 | **Interview Guide Generator** | Claude reads insight evidence and drafts open-ended interview questions; PM pastes into a scheduling tool. | `02-discovery-interview-guide.md` |
| 02 | **Survey Builder** | Short ~5-question survey aimed at affected users to confirm the insight; edit and export before sending. | `03-discovery-survey-builder.md` |
| 03 | **Assumption Mapper** | Surface hidden assumptions in the insight; suggest one way to test or disprove each before Build. | `04-discovery-assumption-mapper.md` |
| 04 | **Competitor Scan** | How 2–3 comparable products handle the problem; Claude suggests who to research and what to look for. | `05-discovery-competitor-scan.md` |

*Until those files exist, the names above are the contract — create them in this same folder and link them from [`README.md`](./README.md).*

**Cross-cutting spec:** behaviour of activity types, states, and DB shape remains anchored in [`../2026-04-25/07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md). Each brief above should link back to that doc and name exact routes, enums, and worker/API touchpoints.

---

## Formal tab structure (app-wide)

**Problem:** Pages like **Reporting** use a **basic tab row** (e.g. **Overview** vs **Ask AI**): functional, but inactive tabs don’t match the active tab’s visual weight, and the pattern isn’t reused consistently elsewhere.

**Goal:**

1. **Design tokens / CSS** — one clear pattern for tab lists: active pill or underline, inactive hover, optional “accent” tab (e.g. Ask AI) that still fits the system.  
2. **Reusable component** — e.g. extend or replace `ReportingTabBar` with something in `apps/web/src/components/ui/` that any page can adopt.  
3. **Rollout** — Reporting first; then any other multi-panel pages (Discover, Build, etc.) as needed.

| Workstream | Agent brief *(add file at this path when splitting work)* |
|------------|--------------------------------------------------------------|
| Tab shell + Reporting adoption | `06-formal-tab-structure.md` |

**Likely code today:** `apps/web/src/components/reporting/ReportingTabBar.tsx`, `apps/web/src/app/app/reporting/page.tsx`, plus `globals.css` for mode-bar / surface variables.

---

## Phase A — Audit & quick wins (start here)

**Goal:** List what’s implemented vs what the discovery plan promised; fix the cheapest gaps.

- [ ] **A1** Walk every `/app/discover` route locally (logged in, with demo/seed data if needed). Note broken links, confusing copy, or dead ends.
- [ ] **A2** Walk **Learn → insight detail** and list every CTA. Is “Start Discovery” (or equivalent) visible and accurate?
- [ ] **A3** Compare to [`07-discovery-plan.md`](../2026-04-25/07-discovery-plan.md) § route structure and § entry points — mark ✅ / 🟡 / ❌ in a short list (can live at the bottom of this file).
- [ ] **A4** Fix any **broken hrefs** or **missing redirects** found in A1–A2 (small PR-sized fixes).

---

## Phase B — Discovery flow improvements

**Goal:** Activities and insight pages feel coherent end-to-end.

- [ ] **B1** **New activity** flow (`/app/discover/insights/[id]/new`): labels, steps, and back navigation match user expectations.
- [ ] **B2** **Activity detail** (`/app/discover/activities/[id]`): state (draft / in progress / complete) is visible; saving findings is obvious.
- [ ] **B3** **Discover landing** (`/app/discover`): explains the mode in one screen; links to “insights with discovery” (or the right list) are clear.
- [ ] **B4** Align **sidebar** labels/order with the four modes if anything still points only at Learn paths (only change what’s inconsistent).

---

## Phase C — Cross-mode “golden thread”

**Goal:** Learn, Discover, and Build feel like one story.

- [ ] **C1** From **Build** (spec new or spec detail), link back to **Discover** / linked insights where data exists.
- [ ] **C2** From **Discover** insight view, **Create spec** or **Continue in Build** is available when the team is ready (even a simple link with query params counts as v1).
- [ ] **C3** Optional: stub **“Discovery summary”** on spec (copy from completed activities) — only if schema/API already supports it; otherwise document as follow-up.

---

## Phase D — Quality bar

**Goal:** Don’t regress the rest of the app.

- [ ] **D1** Run **`yarn ci:local`** (or at least web lint + tests) before pushing.
- [ ] **D2** Quick **mobile check** for mode bar + discover pages (narrow viewport).

---

## Phase E — Discovery activity delivery *(via agent briefs)*

**Goal:** Implement the four “Coming to Discover” capabilities end-to-end (UI + persistence + optional Claude), one brief per feature.

- [ ] **E0** Create the five brief files named in the tables above (`02`–`06`) with acceptance criteria, file lists, and test notes — *then* assign agents.
- [ ] **E1** Interview Guide Generator — `02-discovery-interview-guide.md`.
- [ ] **E2** Survey Builder — `03-discovery-survey-builder.md`.
- [ ] **E3** Assumption Mapper — `04-discovery-assumption-mapper.md`.
- [ ] **E4** Competitor Scan — `05-discovery-competitor-scan.md`.

---

## Phase F — Formal tabs *(via agent brief)*

- [ ] **F0** Write `06-formal-tab-structure.md` (visual spec + component API + Reporting migration steps).
- [ ] **F1** Implement shared tab component + styles; switch Reporting to it.
- [ ] **F2** List other pages that should adopt the same pattern (optional follow-ups in brief).

---

## Out of scope for this branch *(unless a brief explicitly includes it)*

- Full **Reporting** *data layer* changes unrelated to tabs (chart queries, etc.).
- **Data query** discovery activity deep-linking into Reporting — track inside the relevant Discovery brief if needed.
- **Multi-user** / assignments (see [`../Nicktodo/multi-user-plan.md`](../Nicktodo/multi-user-plan.md)) — capture ideas only.

---

## End-of-day checklist

- [ ] Update [`README.md`](./README.md): link any new docs; check off **What shipped today**.
- [ ] When splitting work: add the `02`–`06` briefs and link them in [`README.md`](./README.md).

---

## Working notes (fill in during Phase A)

*Add bullets as you audit — e.g. “Insight 404 when …”, “CTA missing on …”.*

- 
