import { z } from "zod";

/**
 * Shape stored in reporting_requests.result_structured when output_mode is "report / chart".
 * The worker asks the model for JSON matching this schema; the UI uses the same parser to render safely.
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

/** Turn raw DB jsonb into a typed object, or null if the model returned something invalid. */
export function parseReportStructured(raw: unknown): ReportStructured | null {
  const parsed = reportStructuredSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
