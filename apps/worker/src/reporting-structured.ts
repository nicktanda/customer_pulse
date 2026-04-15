import { z } from "zod";

/**
 * Keep in sync with apps/web/src/lib/reporting-structured.ts — worker validates model JSON before saving.
 */
export const reportChartSchema = z
  .object({
    title: z.string().optional(),
    type: z.enum(["bar", "line"]),
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
