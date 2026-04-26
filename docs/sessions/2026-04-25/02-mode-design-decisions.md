# Mode Design Decisions — Learn / Build / Monitor

> Generated: Sat 25 Apr 2026

These are the ten architectural and UX decisions made today for the three-mode product structure. They should be treated as binding design principles — not revisited without a good reason.

---

## 1 · Three distinct modes, not sections

**Decision:** Learn, Build, and Monitor are **modes** — they represent the user's current intent and mental model, not just navigation sections.

**Rationale:**
- A PM triaging overnight feedback is in "Learn" mode. The same person writing specs from those insights is in "Build" mode. Someone checking release health on Monday morning is in "Monitor" mode.
- Using the word "mode" in code (route groups, component names, copy) keeps intent clear throughout the codebase.

**Implementation:** `/app/learn`, `/app/build`, `/app/monitor` top-level route groups. The mode bar tab shows which mode is active.

---

## 2 · ModeBar is always visible

**Decision:** The horizontal mode bar renders on **every** `/app/...` page, including today's existing insights, feedback, themes, and ideas pages.

**Rationale:**
- Always showing the modes normalises the new mental model. Users learn the three-part loop without a one-time explanation.
- Empty or coming-soon modes are still displayed (not hidden). This sets expectations and reduces confusion about "where Build went."

**Implementation:** `<ModeBar />` inserted in `apps/web/src/app/app/layout.tsx` above `<main>`, below the project name header.

---

## 3 · The golden thread — everything traces to insights

**Decision:** Every spec, PRD, and GitHub issue must link back to at least one insight (via the `spec_insights` join table). This traceability is enforced at the product level, not just recommended.

**Rationale:**
- Without this, Build becomes a detached task list disconnected from the customer evidence that justified the work.
- The "golden thread" — customer feedback → insight → spec → feature → monitored metric — is the core product differentiator vs. Jira/Linear.

**Implementation:**
- `spec_insights` join table: `spec_id`, `insight_id`
- New spec form always shows an insight picker (multi-select). Optional, but always present.
- Insight detail page gets a "Create spec from this insight" CTA button.
- Insight count shown on spec list cards.

---

## 4 · Empty states point forward through the loop

**Decision:** Each mode's empty state is written to point the user to the previous mode where they should start, not just say "nothing here yet."

| Mode | Empty state message |
|------|---------------------|
| Build | "No specs yet. Go to Learn → Insights and click Create spec on any insight." |
| Monitor | "Nothing to monitor yet. Ship something in Build first." |

**Rationale:**
- Empty states that just say "No data" create dead ends. Directional empty states teach the product loop on first use.
- Write empty state copy before the data-populated view — it forces clarity on what the page is actually for.

---

## 5 · URL structure

**Decision:** New routes follow the `/app/[mode]/[resource]` pattern. Existing routes redirect via middleware — nothing breaks.

```
/app/learn/                           → mode landing (existing dashboard behaviour)
/app/learn/insights/                  → currently /app/insights/
/app/learn/insights/[id]/             → currently /app/insights/[id]/
/app/learn/feedback/                  → currently /app/feedback/
/app/learn/themes/                    → currently /app/themes/
/app/learn/ideas/                     → currently /app/ideas/

/app/build/                           → mode landing
/app/build/specs/                     → spec list
/app/build/specs/new/                 → new spec form
/app/build/specs/[id]/               → spec detail
/app/build/planner/                   → effort/impact 2×2
/app/build/prds/                      → PRD list

/app/monitor/                         → mode landing
/app/monitor/release-health/          → release health dashboard
/app/monitor/journeys/                → user journey map
```

**Redirects (middleware):**
- `/app/insights` → `/app/learn/insights`
- `/app/feedback` → `/app/learn/feedback`
- `/app/themes` → `/app/learn/themes`
- `/app/ideas` → `/app/learn/ideas`

---

## 6 · Navigation: sidebar within mode, mode bar across modes

**Decision:** The sidebar shows links relevant to the **current mode only**. The mode bar switches between modes.

| Where | What it shows |
|-------|---------------|
| Mode bar (top, horizontal) | Learn / Build / Monitor tabs |
| Sidebar | Links scoped to current mode + always-visible Workspace links |

**Sidebar groups:**
- **Learn** — Insights, Feedback, Themes, Ideas
- **Build** — Specs, Planner (coming soon), PRDs (coming soon)
- **Monitor** — Release Health (coming soon), Session Replays (coming soon)
- **Workspace** — Strategy, Team, Settings, API, Integrations

---

## 7 · Mode landing pages follow a shared template

**Decision:** All mode landing pages (especially for not-yet-built modes like Build and Monitor today) use the same `ModeLandingPage` component template.

**Template structure:**
1. Kicker text (e.g. "COMING SOON")
2. Headline ("Turn insights into specs your team can build")
3. 2–3 sentence body
4. CTA button (primary action)
5. Numbered how-it-works steps (3 steps max)
6. Upcoming features list (4–6 cards in a grid)

**Rationale:**
- Consistent structure reduces design decisions per page.
- Numbered steps teach the mode's loop quickly.
- Coming-soon pages set expectations without being dead ends.

---

## 8 · Colour system — ember theme

**Decision:** Replace the near-black primary with an **ember orange** palette (`#C4501A` light / `#E8793A` dark mode), adapted from the Kairos design system.

**Palette tokens:**

| Variable | Hex | Used for |
|----------|-----|---------|
| `--k-ember` | `#C4501A` | Primary actions, active mode tab, links (light mode) |
| `--k-ember-bright` | `#E8793A` | Primary actions (dark mode), hover states |
| `--k-ember-deep` | `#8B2A0F` | Emphasis text, headings on landing pages |
| `--k-crimson` | `#9B2335` | Danger / destructive states |
| `--k-gold` | `#D4882A` | Warnings |
| `--k-warm-white` | `#F5EDE4` | Warm background tints |
| `--k-warm` | `#C4A882` | Muted warm text |

**Bootstrap mapping:** `--bs-primary` and `--bs-link-color` are overridden to the ember values, so all default Bootstrap component colours update automatically.

**Why ember?** The colour signals energy and action without the aggressive connotations of red. It's warm enough to feel distinctive while staying readable at AA contrast ratios.

---

## 9 · AI-generated content is always labelled

**Decision:** Any text field populated by Claude (user stories, acceptance criteria, spec summaries) gets an **"AI drafted"** badge. The `ai_generated` boolean column is stored on the `specs` row.

**Rationale:**
- PMs need to know what to review carefully. Silent AI generation erodes trust.
- "AI drafted" ≠ "wrong" — it just signals "a human should check this."
- The badge disappears once the PM edits the field (optional UX enhancement for Day 2).

---

## 10 · Mode bar shows counts, not just labels (Day 2)

**Decision:** Each mode tab will eventually show a count badge — unread insights for Learn, draft specs for Build, unresolved monitor alerts for Monitor.

**Rationale:**
- Counts give PMs a reason to click the mode they weren't already in.
- They make the mode bar feel alive vs. static navigation.

**Implementation deferred to Day 2** — the mode bar ships today with labels only. Count queries will be added once the underlying data exists.

---

## Summary — principles to keep in mind while coding

1. **Golden thread first** — spec → insight link is non-negotiable.
2. **Empty states point forward** — always direct users to where they should start.
3. **Mode bar always visible** — never hide modes, even empty ones.
4. **Redirects before refactors** — set up middleware redirects in Phase 1 before moving pages.
5. **AI badge on AI content** — store `ai_generated`, show the badge, let PMs review.
