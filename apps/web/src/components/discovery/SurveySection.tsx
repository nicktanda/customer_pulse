import { draftActivityWithAIAction } from "@/app/app/discover/actions";
import { isSurveyDraftError, validateSurveyShape } from "@/lib/discovery-survey";
import { SurveyActivityPanel } from "./SurveyActivityPanel";

type SurveySectionProps = {
  aiGeneratedContent: Record<string, unknown> | null;
  activityId: number;
  insightId: number;
  isComplete: boolean;
  /** Mirrors interview guide: hide retry if the server has no API key. */
  hasAnthropicKey: boolean;
};

/**
 * Left-panel body for Survey activities only (type 2): AI draft, validation errors with retry,
 * editable exportable survey, or a read-only fallback for older JSON that doesn’t match new rules.
 */
export function SurveySection({
  aiGeneratedContent,
  activityId,
  insightId,
  isComplete,
  hasAnthropicKey,
}: SurveySectionProps) {
  if (!aiGeneratedContent) {
    return (
      <div className="text-center py-2">
        <p className="small text-body-secondary text-start mb-3">
          No survey draft yet. Claude will propose five questions (Likert, multiple choice, and open-ended) you can
          edit and export before you send them to participants.
        </p>
        {hasAnthropicKey ? (
          <form action={draftActivityWithAIAction}>
            <input type="hidden" name="activity_id" value={activityId} />
            <input type="hidden" name="insight_id" value={insightId} />
            <button type="submit" className="btn btn-primary btn-sm">
              Draft with AI
            </button>
          </form>
        ) : (
          <p className="small text-body-secondary text-start mb-0">
            Set <code className="small">ANTHROPIC_API_KEY</code> in the app environment to generate a survey with
            Claude.
          </p>
        )}
      </div>
    );
  }

  if (isSurveyDraftError(aiGeneratedContent)) {
    const detail =
      typeof aiGeneratedContent.detail === "string"
        ? aiGeneratedContent.detail
        : "The draft didn’t meet the expected format.";
    return (
      <div>
        <p className="small fw-medium text-body-secondary mb-2">Survey draft</p>
        <div className="alert alert-warning small mb-3" role="alert">
          <p className="mb-2 fw-medium">We couldn’t save this AI response as a valid survey.</p>
          <p className="mb-0 text-body-secondary">{detail}</p>
        </div>
        {hasAnthropicKey ? (
          <form action={draftActivityWithAIAction} className="d-inline">
            <input type="hidden" name="activity_id" value={activityId} />
            <input type="hidden" name="insight_id" value={insightId} />
            <button type="submit" className="btn btn-sm btn-primary">
              Regenerate with AI
            </button>
          </form>
        ) : (
          <p className="small text-body-secondary mb-0">
            Add <code className="small">ANTHROPIC_API_KEY</code> to the server environment, then you can regenerate.
          </p>
        )}
      </div>
    );
  }

  const validated = validateSurveyShape(aiGeneratedContent);
  if (validated.ok) {
    return (
      <div>
        <p className="small fw-medium text-body-secondary mb-1">Survey (5 questions)</p>
        <p className="small text-body-secondary mb-3">
          {isComplete
            ? "This activity is complete — you can still export copies for your records."
            : "Edit wording below, then copy plain text or Markdown to paste into email, Notion, or a form tool."}
        </p>
        <SurveyActivityPanel
          initial={validated.data}
          activityId={activityId}
          insightId={insightId}
          readOnly={isComplete}
        />
      </div>
    );
  }

  // Older rows or unexpected shapes: still show something readable without blocking the page.
  const questions = Array.isArray(aiGeneratedContent.questions)
    ? (aiGeneratedContent.questions as { question: string; type: string; options?: string[] }[])
    : [];

  return (
    <div>
      <p className="small fw-medium text-body-secondary mb-2">Survey questions (legacy format)</p>
      <p className="small text-body-secondary mb-2">
        This draft doesn’t match the latest validation rules (e.g. five questions with the right mix). You can still
        read it below, or replace it with a fresh AI draft.
      </p>
      {hasAnthropicKey && !isComplete ? (
        <form action={draftActivityWithAIAction} className="mb-3">
          <input type="hidden" name="activity_id" value={activityId} />
          <input type="hidden" name="insight_id" value={insightId} />
          <button type="submit" className="btn btn-sm btn-outline-primary">
            Regenerate with AI
          </button>
        </form>
      ) : null}
      <ol className="ps-4 mb-0">
        {questions.map((q, i) => (
          <li key={i} className="small mb-3">
            <p className="mb-1" style={{ lineHeight: 1.6 }}>
              {q.question}
            </p>
            <span
              className="badge bg-body-secondary text-body-secondary border border-secondary-subtle"
              style={{ fontSize: "0.65rem" }}
            >
              {q.type}
            </span>
            {q.options && q.options.length > 0 ? (
              <ul className="mt-1 mb-0 ps-3">
                {q.options.map((opt, j) => (
                  <li key={j} className="small text-body-secondary">
                    {opt}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
