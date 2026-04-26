# Feature Proposals — Build + Monitor

> Generated: Sat 25 Apr 2026

The current product covers **Capture → Analyse → Pulse**. These proposals extend the loop:

**Capture → Analyse → Pulse → Build → Ship → Monitor → (back to Capture)**

---

## The full loop

| Stage | How | Tools |
|-------|-----|-------|
| Capture | Linear, Slack, Jira, Custom API, Google Forms… | Existing integrations |
| Analyse | AI classify + insight generation + themes | Existing pipeline |
| Pulse | Daily email digest | Existing |
| **Build** | Specs → PRD → GitHub Issues | **New** |
| Ship | Feature released via PR merge | |
| **Monitor** | LogRocket session data + new feedback | **New** |

The loop closes when Monitor surfaces new signals back into Capture.

---

## Build area — 6 features

### 01 · Spec Generator
**Effort:** Medium · **Impact:** High

AI converts insight clusters and ideas into structured build specs: user stories, acceptance criteria, and definition of done. Pulls directly from the existing `insights` and `ideas` tables.

- Select 1–N insights → Claude drafts a spec with user stories
- Acceptance criteria auto-generated from the `evidence` field
- Spec stored in new `specs` table linked to ideas/insights
- Edit and refine in a rich text editor before locking

**Hooks into:** insights, ideas, themes

---

### 02 · Spec Board
**Effort:** Medium · **Impact:** High

Kanban-style board moving specs through Backlog → Drafting → Review → Ready → In Progress → Shipped.

- Drag-and-drop column board under `/app/build`
- Filter by team, priority, or linked theme
- Card shows linked insight count and effort/impact score
- Shipped column triggers handoff to Monitor area

**Hooks into:** specs

---

### 03 · PRD Builder
**Effort:** High · **Impact:** High

Bundle multiple specs into a full Product Requirements Document. Claude synthesises the spec set into a coherent narrative with background, goals, non-goals, and success metrics.

- Multi-select specs → "Create PRD" action
- Claude uses `project.business_objectives` for goal framing
- Stored in `prds` table with version history
- Markdown export + read-only share URL

**Hooks into:** specs, ideas, strategy

---

### 04 · Effort / Impact Planner
**Effort:** Low · **Impact:** Medium

Interactive 2×2 matrix plotting specs by AI-estimated effort and impact. AI scores already exist on ideas — this surfaces them visually.

- Scatter plot at `/app/build/planner`
- Drag dots to override AI estimates
- Quick-win quadrant highlighted
- One-click "Move to Spec Board" from planner

**Hooks into:** ideas, specs

---

### 05 · GitHub Issue Sync
**Effort:** Medium · **Impact:** Medium

Push a spec as a GitHub Issue and pull PR status back into the Spec Board. Extends existing `idea_pull_requests` table.

- One-click "Push to GitHub" from spec detail
- GitHub issue body pre-filled from spec content
- PR merge → spec auto-moves to Shipped
- Existing `GenerateGithubPrJob` reused / extended

**Hooks into:** specs, idea_pull_requests, integrations

---

### 06 · Team Assignment
**Effort:** Low · **Impact:** Medium

Assign specs to teams defined in the Strategy section. AI suggests the best-fit team based on team objectives vs spec content.

- Team picker on spec card and detail page
- AI suggestion uses `team.objectives` similarity
- Team backlog view under `/app/build/teams/[id]`
- Notify team (Slack integration) when spec is assigned

**Hooks into:** teams, specs

---

## Monitor area — 6 features

> LogRocket already has a `SyncLogRocketJob` in the worker and credentials in the `integrations` table — no new auth flow needed.

### 01 · Session Replay Linking
**Effort:** Medium · **Impact:** High

Link feedback items to LogRocket session replays where the issue occurred.

- LogRocket sync enriches feedback with `session_replay_url`
- Replay button on feedback detail page
- Inline replay viewer (LogRocket iframe embed)
- Filter feedback list by "has replay"

**Hooks into:** feedbacks, LogRocket sync

---

### 02 · Feature Adoption Tracking
**Effort:** High · **Impact:** High

When a spec ships, LogRocket custom events tied to that feature are tracked and surfaced in Customer Pulse.

- Spec ships → LogRocket event tag created via API
- New `feature_metrics` table stores daily event counts
- Adoption chart on spec detail (shipped state)
- Top adopted features in weekly pulse digest

**Hooks into:** specs, LogRocket events, pulse_reports

---

### 03 · Error → Feedback Pipeline
**Effort:** Medium · **Impact:** High

LogRocket JS errors above a threshold auto-create feedback items so errors flow into the same triage pipeline as written feedback.

- LogRocket sync detects error sessions above threshold
- Auto-creates feedback with `category=bug, source=logrocket`
- AI summarises the error stack + session path
- Deduplication by error fingerprint (`source_external_id`)

**Hooks into:** LogRocket sync, feedbacks, process_feedback job

---

### 04 · User Journey Mapping
**Effort:** High · **Impact:** Medium

Visualise the page paths users take before submitting feedback or before a LogRocket rage-click event.

- Sankey / flow chart under `/app/monitor/journeys`
- Filter by feedback category or insight theme
- Highlight drop-off steps with high feedback volume
- Export journey as PNG for design review

**Hooks into:** feedbacks, insights, LogRocket sessions

---

### 05 · Release Health Dashboard
**Effort:** Medium · **Impact:** High

After a spec ships, a 7-day release health view compares pre- vs post-release: feedback volume, error rate, session rage clicks, and AI-detected sentiment shift.

- Automatically activates when spec moves to Shipped
- Pre/post comparison uses 7-day windows
- Sentiment trend from feedback AI confidence scores
- Alert if feedback volume spikes > 2× baseline

**Hooks into:** specs, feedbacks, LogRocket events, insights

---

### 06 · Segment Correlation
**Effort:** Medium · **Impact:** Medium

Match LogRocket user segments (plan, company size, cohort) to the stakeholder segments already modelled in Customer Pulse.

- LogRocket user traits synced to `stakeholder_segments`
- Segment breakdown on Insights page
- Callout when a segment's feedback rate is an outlier
- Drive targeted pulse emails to segment owners

**Hooks into:** stakeholder_segments, LogRocket segments, feedbacks

---

## New DB tables needed

### For Build

| Table | Key columns | Linked to |
|-------|------------|-----------|
| `specs` | `title, user_stories, acceptance_criteria, status, effort_score, impact_score, ai_generated` | ideas, insights, teams, projects |
| `prds` | `title, content_markdown, status, version` | specs, projects |
| `spec_github_issues` | `spec_id, issue_number, repo, pr_number, merged_at` | specs, integrations |

### For Monitor

| Table | Key columns | Linked to |
|-------|------------|-----------|
| `feature_metrics` | `spec_id, date, event_count, session_count, error_count, rage_click_count` | specs, integrations |
| `release_health_snapshots` | `spec_id, window_start, window_end, pre_feedback_volume, post_feedback_volume, pre_error_rate, post_error_rate` | specs, feedbacks |

---

## Suggested build order

| # | Feature | Why |
|---|---------|-----|
| 1 | Effort / Impact Planner | Ideas table already has scores — pure UI, very low risk |
| 2 | Team Assignment | Teams table exists, needs a spec picker |
| 3 | **Spec Generator** | Core Build primitive — everything else depends on specs existing |
| 4 | Spec Board | Natural next step after generator |
| 5 | Session Replay Linking | LogRocket sync already runs — just add `session_replay_url` column |
| 6 | Error → Feedback Pipeline | Reuses existing feedback ingest + `process_feedback` job |
| 7 | GitHub Issue Sync | Extends existing `idea_pull_requests` |
| 8 | Release Health Dashboard | Needs specs + LogRocket events — build after both are live |
| 9 | Feature Adoption Tracking | Requires LogRocket event tagging API |
| 10 | Segment Correlation | Needs `stakeholder_segments` + LogRocket user traits sync |
| 11 | PRD Builder | High value but complex — after Spec Generator is proven |
| 12 | User Journey Mapping | Most complex visualisation — tackle last |
