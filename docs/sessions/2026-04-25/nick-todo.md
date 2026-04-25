# Nick Todo — Outcome Tracking Thread

> Feature spec for closing the loop between Build and Monitor.
> Generated: Sat 25 Apr 2026

---

## What this is

Right now the "golden thread" ends at Ship:

```
Feedback → Insight → Spec → Ship
```

This feature extends it into Monitor so PMs can see whether the things they built actually fixed the problems they were trying to fix:

```
Feedback → Insight → Spec + Hypothesis → Ship → Outcome Signal (Monitor)
```

The measurement infrastructure already exists — every spec links to insights (`spec_insights`), and every insight links to feedback (`feedback_insights`). We just need to snapshot those numbers at ship time and compare them 7 days later.

---

## Database changes

### Two new columns on `specs`

| Column | Type | Purpose |
|--------|------|---------|
| `success_hypothesis` | `text` (nullable) | Free-text: what does success look like after this ships? |
| `shipped_at` | `timestamptz` (nullable) | Set when status moves to `shipped` (5). Baseline anchor. |

### One new table: `spec_outcome_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial PK | |
| `spec_id` | bigint FK → specs | |
| `snapshot_date` | date | One row per day per spec |
| `window_type` | integer | 0 = pre, 1 = post |
| `feedback_count` | integer | Feedback items linked to spec's insights in this window |
| `avg_sentiment_score` | float (nullable) | Average AI confidence score of related feedback |
| `open_insight_count` | integer | How many of the spec's linked insights are still open |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique index on:** `(spec_id, snapshot_date, window_type)`

Pre-ship rows are written once at ship time and never change. Post-ship rows are upserted daily by the worker job.

---

## Changes to Build

### 1. New spec form — success hypothesis field

Add a `success_hypothesis` text field below acceptance criteria.

- **Placeholder:** "After this ships, what signal will tell us it worked? e.g. Fewer complaints about checkout errors"
- Optional — don't block spec creation if blank
- Empty hypotheses show "No hypothesis set" in Monitor as a nudge

### 2. Spec detail page

Show the hypothesis in a read-only banner when `status >= in_progress`. Gives devs and PMs a shared reminder of what they're measuring.

### 3. Status transition to Shipped

When status moves to `shipped` (integer 5):

1. Set `shipped_at = now()`
2. Snapshot the current feedback count for all linked insights → write as `window_type = pre` row in `spec_outcome_snapshots`
3. Enqueue `TrackSpecOutcomesJob` for this spec immediately (don't wait for the daily cron)

### 4. Spec list cards

Add a small outcome signal badge to shipped spec cards in `/app/build/specs`:

- **Improving** (green pill) — post-ship feedback volume < 75% of baseline
- **Flat** (grey pill) — within 25% of baseline
- **Worse** (red pill) — post-ship volume > 125% of baseline

---

## New Monitor pages

These replace the current `ModeLandingPage` placeholder. Monitor becomes a real mode the moment the first spec is shipped.

### `/app/monitor/release-health`

List of all shipped specs with:

- Spec title + ship date
- Success hypothesis (or "No hypothesis set")
- Outcome signal badge (improving / flat / worse)
- Link to spec detail

Empty state: "No shipped specs yet. Mark a spec as Shipped in Build to start tracking." (Keep the ModeLandingPage as the empty state component inside this page.)

### `/app/monitor/release-health/[specId]`

Per-spec outcome detail:

- Hypothesis banner
- Pre/post comparison: feedback volume, avg sentiment score, open insight count
- 7-day rolling post window
- List of feedback items from the post-ship window that match the linked insights

---

## Worker job: `TrackSpecOutcomesJob`

New BullMQ job in `apps/worker`. Follows the same pattern as existing sync jobs.

| Aspect | Design |
|--------|--------|
| Trigger | Daily cron + on-demand when spec is marked Shipped |
| Input | All specs where `status = 5` and `shipped_at IS NOT NULL` |
| Pre window | Count feedback linked to spec's insights in the 7 days before `shipped_at` (written once — skip if pre row already exists) |
| Post window | Count feedback linked to spec's insights in the 7 days after `shipped_at` (rolling — today minus 7 days to today, if past that window use first 7 days) |
| Signal logic | `post < 0.75 × pre` = improving; within 25% = flat; `post > 1.25 × pre` = worse |
| Output | Upsert `spec_outcome_snapshots` rows. When signal = improving for 7+ consecutive days, auto-set `insight.status = addressed` with a note "Auto-closed by [Spec title]" |

**Query path for counting feedback:**

```
spec_outcome_snapshots ← spec_id
    → spec_insights (spec_id)
    → insight_id
    → feedback_insights (insight_id)
    → feedback_id
    → feedbacks WHERE created_at BETWEEN window_start AND window_end
```

---

## Implementation plan

### Phase 1 — Hypothesis field in Build (~1 hour)

- [ ] Add `success_hypothesis` column to `specs` (Drizzle migration)
- [ ] Add `shipped_at` column to `specs` (same migration)
- [ ] Add field to new spec form (`/app/build/specs/new`)
- [ ] Add field to spec detail/edit page
- [ ] Set `shipped_at` when status is set to `shipped` in the server action (`apps/web/src/app/app/build/actions.ts`)

**Unlocks:** PMs can record intent before shipping. Baseline anchor exists in the DB.

---

### Phase 2 — Snapshot table + worker job (~2 hours)

- [ ] Create `spec_outcome_snapshots` table (Drizzle migration)
- [ ] Add `TrackSpecOutcomesJob` to `apps/worker`
- [ ] Register daily schedule in worker scheduler
- [ ] Add on-demand trigger from the spec ship action in `apps/web`
- [ ] Implement pre and post window feedback count queries (uses `spec_insights → feedback_insights → feedbacks`)
- [ ] Add `getSpecOutcomeSnapshot` query helper in `packages/db/src/queries/specs.ts`

**Unlocks:** Data pipeline is running. Monitor pages have something to display.

---

### Phase 3 — Monitor release health pages (~2 hours)

- [ ] Create `/app/monitor/release-health/page.tsx` — shipped spec list + signal badges
- [ ] Create `/app/monitor/release-health/[specId]/page.tsx` — pre/post comparison detail
- [ ] Feedback list filtered to linked insight topics (post-ship window)
- [ ] Remove `ModeLandingPage` as the default Monitor view — use it as the empty state inside release-health instead
- [ ] Add "Release Health" link to sidebar under Monitor section (`SidebarNav.tsx`)

**Unlocks:** PMs can open Monitor on Monday morning and see if their ship worked.

---

### Phase 4 — Build list outcome badges + insight auto-close (~1 hour)

- [ ] Add outcome signal badge (improving / flat / worse) to spec cards in `/app/build/specs`
- [ ] When signal = improving for 7+ consecutive days, auto-set `insight.status = addressed`
- [ ] Show "Closed by [Spec title]" label on addressed insights in Learn

**Unlocks:** The full loop closes — customer pain is visibly resolved back in Learn.

---

## Design rules

**Hypothesis is optional, but prompted.** Don't block spec creation if no hypothesis is entered. But make it prominent and include a helpful placeholder. Empty hypotheses show "No hypothesis set" in Monitor — a nudge to fill it in next time.

**Pre-window is fixed at ship time.** The baseline is captured once when status moves to shipped. It never changes. Comparisons are stable even as time passes. Don't recalculate the pre-window retroactively.

**Outcome signal uses insight links, not keywords.** We measure feedback linked to the spec's insights via the existing join tables — not keyword search. This keeps it precise and reuses the golden thread. No NLP needed in v1.

**Insight auto-close is additive, not destructive.** Auto-setting `insight.status = addressed` is a suggestion, not a forced close. PMs can reopen. Always log "Auto-closed by [spec title]" so it's traceable.

---

## Out of scope for v1

| Feature | Why deferred |
|---------|--------------|
| LogRocket session event tracking | Requires LogRocket API event tagging — separate integration work |
| Configurable signal thresholds per spec | Settings overhead — hardcode 75%/125% for v1 |
| Sentiment trend chart | Needs avg_sentiment data to exist for several weeks first |
| Slack/email alert when signal = worse | Valuable but builds on top of the data pipeline — Phase 5 |
| Team-level outcome rollup | After per-spec view is stable |

---

*Customer Pulse — Nick Todo generated Sat 25 Apr 2026*
