# Natural Language Graph Generation — Spec

> Session: Sat 25 Apr 2026

---

## What we're building

A user types a plain-English question like *"Show me a pie chart of feedback by category for the last 90 days"* and gets a rendered, interactive chart back in the Reporting page — no configuration panel, no field picker.

This extends the **existing** NL assistant (already in `ReportingNlAssistant.tsx`) rather than replacing it. The goal is to make the "Report + charts" mode feel purpose-built for graphs: richer chart types, a smarter prompt, user-controlled time range, and the ability to **pin a chart** so it persists on the page.

---

## Current state (what already exists)

| Piece | File | What it does today |
|-------|------|--------------------|
| UI input | `ReportingNlAssistant.tsx` | Textarea + two radio buttons (`answer` / `report_chart`), polls BullMQ |
| Worker job | `reporting-nl.ts` | Builds a context bundle, calls Claude, stores result in `reporting_requests` |
| Context bundle | `buildReportingContextBundle()` | Fixed 30-day window; aggregated counts + 12 text snippets |
| Output schema | `reporting-structured.ts` (both apps) | `{ narrative, charts: [{type:"bar"|"line", labels, series}] }` |
| Chart renderer | `NlResultCharts.tsx` | Recharts `BarChart` and `LineChart` only |
| DB table | `reporting_requests` | One row per request; `result_structured` is JSONB |

**Gaps this spec addresses:**

1. Only `bar` and `line` charts — no pie, stacked, area, scatter
2. Context window is hard-coded to 30 days; ignores the range the user has selected on the page or mentions in their prompt
3. Charts disappear when the page refreshes — no pinning
4. The system prompt for chart mode is generic; it doesn't guide Claude toward the specific chart shapes the renderer actually supports
5. No quick-start prompts or suggestions to help new users

---

## User flow

```
[Reporting page]
   │
   ├── User types: "Pie chart of feedback by source, last 7 days"
   │
   ├── User selects output mode: "Graph" (new mode, distinct from "Quick answer")
   │
   ├── Optional: user picks a date range (7 / 30 / 90 d) — or the page's active range is used
   │
   ├── Click "Generate"  →  POST /api/app/reporting/ask
   │                               { prompt, outputMode: "report_chart", rangeDays: 7 }
   │
   ├── Worker picks up the job
   │   ├── Builds a context bundle for the specified rangeDays (not hardcoded 30)
   │   └── Calls Claude with a graph-specific system prompt
   │
   ├── UI polls /api/app/reporting/requests/:id
   │
   ├── Result appears:
   │   ├── Narrative (1–2 sentences explaining what the chart shows)
   │   └── One or more interactive charts (Recharts)
   │
   └── "Pin to page" button saves the chart to `pinned_report_charts` table
       └── Pinned charts appear at the top of the Reporting page (persisted across reloads)
```

---

## Prompt examples to support

These should all produce correct chart output:

| Prompt | Expected chart |
|--------|---------------|
| `Show feedback volume by day, last 30 days` | Line chart, x=date, y=count |
| `Pie chart of feedback by category` | Pie chart |
| `Compare bug vs feature request volume over the last 90 days as a line chart` | Multi-series line |
| `Stacked bar: feedback by source and priority` | Stacked bar |
| `Top 5 themes by priority score` | Horizontal bar |
| `How has feedback volume changed week over week?` | Line chart with 2 series (this week vs last) |
| `Area chart: daily feedback, last 14 days` | Area chart |

---

## Chart types to add

Extend the `type` field in the structured output schema:

| Type | Recharts component | When Claude should use it |
|------|--------------------|--------------------------|
| `bar` | `BarChart` | Comparing discrete categories |
| `bar_stacked` | `BarChart` with `stackId` | Breakdown within categories (e.g. source × priority) |
| `bar_horizontal` | `BarChart` with `layout="vertical"` | Long category names (themes list) |
| `line` | `LineChart` | Time-series data |
| `area` | `AreaChart` | Time-series where cumulative feel matters |
| `pie` | `PieChart` + `Pie` | Proportions of a whole (≤ 8 slices) |
| `scatter` | `ScatterChart` | Two numeric dimensions (effort × impact) |

The Zod schema (`reportChartSchema`) needs a new `type` discriminated union and a `stacked?: boolean` flag.

For `pie`, the data shape is slightly different — one series, one value per label — so the schema needs a note that `series` will have exactly one entry for pie charts. Claude must be told this in the system prompt.

---

## Architecture changes

### 1 · `rangeDays` parameter threaded through

**`/api/app/reporting/ask` route handler**
- Accept `rangeDays: number` in the POST body (validated: must be 7, 30, or 90)
- Write it to a new `range_days` column on `reporting_requests`

**`reporting_requests` table — new column**
```sql
ALTER TABLE reporting_requests ADD COLUMN range_days integer NOT NULL DEFAULT 30;
```

**`buildReportingContextBundle(db, projectId, rangeDays)`**
- Remove the hardcoded `CONTEXT_RANGE_DAYS = 30`
- Accept `rangeDays` as a parameter
- Pass from `processReportingNlJob` after reading it from the row

### 2 · Stronger system prompt for graph mode

Replace the current generic chart prompt with a graph-specific one:

```
You are a data visualisation assistant for a PM tool.
You receive aggregated JSON about customer feedback. 
Your job is to produce chart-ready JSON only — no prose except the short "narrative" field.

Supported chart types: bar, bar_stacked, bar_horizontal, line, area, pie, scatter.
For pie charts: series must have exactly ONE entry; labels = slice names; series[0].data = values.
For scatter: labels = point names; series[0].data = x values; series[1].data = y values.
For bar_stacked: each series is one stack segment; all data arrays must have equal length.

Rules:
- Use ONLY data from the provided JSON — never invent numbers.
- Choose the chart type that best answers the user's question.
- If the user specifies a type, use that type.
- Keep narrative under 100 words.
- Respond ONLY with a valid JSON object matching:
  {"narrative": string, "charts": [{"title"?: string, "type": ChartType, "labels": string[], "series": [{"name": string, "data": number[]}]}]}
```

### 3 · Extended Zod schema

In both `apps/worker/src/reporting-structured.ts` and `apps/web/src/lib/reporting-structured.ts`:

```typescript
export const CHART_TYPES = ["bar", "bar_stacked", "bar_horizontal", "line", "area", "pie", "scatter"] as const;
export type ChartType = typeof CHART_TYPES[number];

export const reportChartSchema = z.object({
  title: z.string().optional(),
  type: z.enum(CHART_TYPES),
  labels: z.array(z.string()),
  series: z.array(z.object({
    name: z.string(),
    data: z.array(z.number()),
  })),
}).refine(c => c.series.every(s => s.data.length === c.labels.length), {
  message: "series data length must match labels length",
});
```

### 4 · `NlResultCharts.tsx` — render new types

Add cases for each new chart type using existing Recharts components (already installed):

- `PieChart` + `Pie` + `Cell` (use ember palette for slices)
- `AreaChart` (same structure as LineChart, swap component)
- `BarChart layout="vertical"` for `bar_horizontal`
- `BarChart` with `stackId="a"` on each `Bar` for `bar_stacked`
- `ScatterChart` for scatter

### 5 · Pinned charts (`pinned_report_charts` table)

New table:

```sql
CREATE TABLE pinned_report_charts (
  id          bigserial PRIMARY KEY,
  project_id  bigint NOT NULL REFERENCES projects(id),
  created_by  bigint NOT NULL REFERENCES users(id),
  title       varchar(255) NOT NULL,
  prompt      text NOT NULL,
  -- Snapshot of the chart JSON at pin time (denormalised for display)
  chart_json  jsonb NOT NULL,
  narrative   text,
  range_days  integer NOT NULL DEFAULT 30,
  pinned_at   timestamp with time zone NOT NULL DEFAULT now(),
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX index_pinned_report_charts_on_project_id ON pinned_report_charts(project_id);
```

Drizzle schema + migration required (follow `database-migrations-rollout` skill).

**API route:** `POST /api/app/reporting/pin` — accepts `{ requestId, chartIndex }`, creates a `pinned_report_charts` row from the matching `reporting_requests.result_structured[charts[chartIndex]]`.

**Delete:** `DELETE /api/app/reporting/pin/:id` — removes a pinned chart (owner or project admin only).

### 6 · Reporting page layout changes

**Pinned charts section** — rendered server-side above the static charts:

```
[Reporting page]
├── Page header + time range buttons
├── Summary metric tiles
├── ─── Pinned charts (if any) ───────────────────────────────
│   └── PinnedChartGrid component (renders saved chart JSONs, "Unpin" button each)
├── Feedback volume by day (static)
├── Breakdown bar charts (static)
├── Top themes / recent insights
└── NL assistant (bottom, as today)
```

### 7 · UI changes to `ReportingNlAssistant`

- Rename "Report + charts" radio to **"Generate graph(s)"** for clarity
- Add a **date range selector** (7 / 30 / 90 d) inside the assistant card — defaults to the page-level `rangeDays` passed as a prop
- Add **quick-start chips** above the textarea (click to populate):
  - "Feedback by category (pie)"
  - "Volume by day"
  - "Top themes by score"
  - "Bugs vs features over time"
- After a successful chart result, add a **"Pin to page"** button per chart (calls the new `/api/app/reporting/pin` route)

---

## Files to create / modify

| File | Change |
|------|--------|
| `packages/db/src/schema.ts` | Add `pinnedReportCharts` table |
| `packages/db/drizzle/migrations/` | New migration SQL |
| `apps/worker/src/reporting-structured.ts` | Extend `CHART_TYPES` + Zod schema |
| `apps/worker/src/reporting-nl.ts` | Accept `rangeDays`, improve system prompt |
| `apps/web/src/lib/reporting-structured.ts` | Mirror extended schema |
| `apps/web/src/app/api/app/reporting/ask/route.ts` | Accept `rangeDays` in POST body |
| `apps/web/src/app/api/app/reporting/pin/route.ts` | **New** — pin a chart |
| `apps/web/src/app/api/app/reporting/pin/[id]/route.ts` | **New** — unpin a chart |
| `apps/web/src/components/reporting/NlResultCharts.tsx` | Render new chart types |
| `apps/web/src/components/reporting/ReportingNlAssistant.tsx` | Range selector, chips, Pin button |
| `apps/web/src/components/reporting/PinnedChartGrid.tsx` | **New** — server component renders pinned charts |
| `apps/web/src/app/app/reporting/page.tsx` | Query pinned charts, pass to `PinnedChartGrid` |

---

## Build order (phases)

### Phase 1 — Schema + extended chart types (lowest risk, no UI changes)
1. Add `range_days` column migration
2. Add `pinned_report_charts` table migration
3. Extend Zod schema in both worker and web (`CHART_TYPES`)
4. Unit-test the new schema with `reporting-structured.test.ts`

### Phase 2 — Better worker + prompt
1. Thread `rangeDays` through the API route → job → context bundle
2. Replace system prompt with the graph-specific version above
3. Manual smoke test: ask for a pie chart and a stacked bar

### Phase 3 — Render new chart types
1. Extend `NlResultCharts.tsx` with pie, area, bar_horizontal, bar_stacked, scatter
2. Write a Storybook story (or a simple test page) with hardcoded data to verify each type visually

### Phase 4 — Pinning
1. Build `POST /api/app/reporting/pin` route
2. Build `DELETE /api/app/reporting/pin/:id` route
3. Build `PinnedChartGrid` server component
4. Add "Pin" button to `NlResultCharts` (needs to become a client component wrapper)
5. Integrate pinned section into the Reporting page

### Phase 5 — UX polish
1. Quick-start prompt chips
2. Range selector inside the assistant card
3. Empty state for the pinned section ("No pinned charts yet — generate one below")
4. Rename radio label

---

## Edge cases and constraints

| Case | Handling |
|------|----------|
| Claude returns invalid `type` value | Zod `safeParse` fails → fall back to `bar`; log a warning |
| Pie chart with > 8 slices | Recharts `Pie` still renders but gets messy — system prompt should say "limit pie to 8 slices max, merge the rest as Other" |
| Scatter with mismatched series | Zod refine already catches `data.length !== labels.length` |
| Pinned chart JSON becomes stale (feedback data changes) | Pinned charts are snapshots; add a subtitle "Pinned on [date]" so users know |
| User pins a chart then deletes the originating `reporting_request` | `pinned_report_charts.chart_json` is denormalised — safe, no FK to `reporting_requests` needed |
| Empty context bundle (new project, no feedback) | Context JSON already handles 0 counts; Claude will produce a chart with no data, which Recharts renders as empty axes — acceptable |
| Worker not running | Existing 503 path in `ask` route already surfaces this |

---

## Open questions

1. **Multi-chart pins** — should "Pin to page" pin all charts from one response at once, or let the user choose per chart? Start with per-chart (simpler).
2. **Chart ordering on page** — should pinned charts be reorderable (drag to reorder)? Skip for v1.
3. **`scatter` data source** — the current context bundle doesn't expose two numeric dimensions per data point (only aggregated counts). For effort×impact scatter, we'd need to query `specs` or `ideas` instead. Defer scatter to v2 until those tables are used in reporting.
4. **Token cost** — the graph system prompt is more prescriptive, which may add ~200 tokens. Still well within Haiku's budget at current usage levels.
