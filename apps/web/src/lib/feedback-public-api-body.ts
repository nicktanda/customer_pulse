import { z } from "zod";

/**
 * Validates the JSON body for POST /api/v1/feedback.
 * Lives in `lib/` so Vitest can import it without pulling in the full route (DB, Redis, etc.).
 */
export const publicFeedbackIngestBodySchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  author_name: z.string().optional(),
  author_email: z.string().optional(),
  category: z.union([z.string(), z.number()]).optional(),
  priority: z.union([z.string(), z.number()]).optional(),
  raw_data: z.record(z.unknown()).optional(),
  external_id: z.string().optional(),
});

export type PublicFeedbackIngestBody = z.infer<typeof publicFeedbackIngestBodySchema>;
