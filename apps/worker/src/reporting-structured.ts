import { z } from "zod";

/**
 * Keep in sync with apps/web/src/lib/reporting-structured.ts — worker validates model JSON before saving.
 *
 * Supported chart types:
 *   bar           — grouped/single bars, comparing discrete categories
 *   bar_stacked   — stacked bars (each series is one stack segment)
 *   bar_horizontal — horizontal bars with layout="vertical" (good for long labels)
 *   line          — time-series line chart
 *   area          — time-series area chart (cumulative feel)
 *   pie           — proportions of a whole (≤ 8 slices); series must have exactly ONE entry
 *   scatter       — two numeric dimensions (deferred to v2 — no dual-axis context yet)
 */
export const CHART_TYPES = [
  "bar",
  "bar_stacked",
  "bar_horizontal",
  "line",
  "area",
  "pie",
  "scatter",
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const reportChartSchema = z
  .object({
    title: z.string().optional(),
    type: z.enum(CHART_TYPES),
    labels: z.array(z.string()),
    series: z.array(
      z.object({
        name: z.string(),
        data: z.array(z.number()),
      }),
    ),
  })
  .refine((c) => c.series.every((s) => s.data.length === c.labels.length), {
    message: "Each series data length must match labels length",
  });

export const reportStructuredSchema = z.object({
  narrative: z.string(),
  charts: z.array(reportChartSchema),
});

export type ReportStructured = z.infer<typeof reportStructuredSchema>;

export function stripJsonFence(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  }
  return t;
}
