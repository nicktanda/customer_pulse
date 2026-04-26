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

## Out of scope for today (unless trivial)

- Brand-new activity **types** not already in the codebase.
- Full **Reporting** integration for “data query” activities (unless already wired).
- **Multi-user** / assignments (see [`../Nicktodo/multi-user-plan.md`](../Nicktodo/multi-user-plan.md)) — capture ideas only.

---

## End-of-day checklist

- [ ] Update [`README.md`](./README.md): link any new docs; check off **What shipped today**.
- [ ] Note follow-ups for next session in this file or a new `02-…` doc.

---

## Working notes (fill in during Phase A)

*Add bullets as you audit — e.g. “Insight 404 when …”, “CTA missing on …”.*

- 
