/**
 * Pure helpers for the Discovery “Interview guide” activity (type 1).
 * Used by the activity detail UI, server actions, and unit tests.
 */

/** Stored in `ai_generated_content` when Claude responded but we could not parse/validate the JSON. */
export const INTERVIEW_DRAFT_ERROR_KEY = "_interviewDraftError" as const;

/**
 * Human-readable label for `insights.insight_type` (see packages/db InsightType).
 * Used in Claude prompts so questions match the kind of signal (B2B problem vs UX, etc.).
 */
export function insightTypeLabelForPrompt(insightType: number): string {
  const labels: Record<number, string> = {
    0: "Problem (something going wrong for customers)",
    1: "Opportunity (unmet need or upside)",
    2: "Trend (direction the market is moving)",
    3: "Risk (threat that needs attention)",
    4: "User need (specific need or job-to-be-done)",
  };
  return labels[insightType] ?? "Unknown type";
}

/**
 * True when the activity row was saved with a “draft failed” marker after a run.
 */
export function isInterviewGuideDraftErrorRecord(
  content: Record<string, unknown> | null | undefined,
): boolean {
  return content != null && content[INTERVIEW_DRAFT_ERROR_KEY] === true;
}

/**
 * Returns interview questions if the content looks like a valid guide; otherwise null.
 * Ignores the draft-error marker object.
 */
export function getInterviewGuideQuestions(
  content: Record<string, unknown> | null | undefined,
): string[] | null {
  if (content == null || isInterviewGuideDraftErrorRecord(content)) return null;
  const raw = content.questions;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const questions = raw.filter((q) => typeof q === "string" && String(q).trim().length > 0);
  return questions.length > 0 ? questions : null;
}

/**
 * Whether Claude’s JSON has the shape we need for a successful interview guide save.
 */
export function isValidClaudeInterviewGuideResponse(parsed: Record<string, unknown>): boolean {
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return false;
  return parsed.questions.every((q) => typeof q === "string" && String(q).trim().length > 0);
}

/**
 * Plain text: numbered list, one question per line — for email, Calendly, etc.
 * (The on-page UI uses a separate `<ol>`; this string is for clipboard export.)
 */
export function formatInterviewQuestionsForCopy(questions: string[]): string {
  return questions
    .map((q, i) => {
      const line = String(q).trim();
      return `${i + 1}. ${line}`;
    })
    .join("\n");
}
