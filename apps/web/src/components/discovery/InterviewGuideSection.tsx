import { draftActivityWithAIAction } from "@/app/app/discover/actions";
import {
  getInterviewGuideQuestions,
  isInterviewGuideDraftErrorRecord,
} from "@/lib/discovery-interview-guide";
import { InterviewGuideActions } from "./InterviewGuideActions";

type InterviewGuideSectionProps = {
  aiGeneratedContent: Record<string, unknown> | null;
  activityId: number;
  insightId: number;
  isComplete: boolean;
  /** Set on the server from `process.env.ANTHROPIC_API_KEY` so we do not leak secrets. */
  hasAnthropicKey: boolean;
};

/**
 * Left-panel body for “Interview guide” activities only (type 1):
 * list of questions, copy/regenerate, or recovery from a bad AI response.
 */
export function InterviewGuideSection({
  aiGeneratedContent,
  activityId,
  insightId,
  isComplete,
  hasAnthropicKey,
}: InterviewGuideSectionProps) {
  const isDraftError = isInterviewGuideDraftErrorRecord(aiGeneratedContent);
  const questions = getInterviewGuideQuestions(aiGeneratedContent);

  if (isDraftError) {
    return (
      <div>
        <p className="small fw-medium text-body-secondary mb-2">Interview questions</p>
        <div
          className="alert alert-warning small mb-3"
          role="alert"
        >
          <p className="mb-2 fw-medium">We could not read the last AI response as a question list.</p>
          <p className="mb-0 text-body-secondary">
            That sometimes happens if the model returns extra text or invalid JSON. Try again — the model usually
            responds correctly on a second run.
          </p>
        </div>
        {hasAnthropicKey ? (
          <form action={draftActivityWithAIAction} className="d-inline">
            <input type="hidden" name="activity_id" value={activityId} />
            <input type="hidden" name="insight_id" value={insightId} />
            <button type="submit" className="btn btn-sm btn-primary">
              Retry with AI
            </button>
          </form>
        ) : (
          <p className="small text-body-secondary mb-0">
            Add <code className="small">ANTHROPIC_API_KEY</code> to the server environment, then you can retry.
          </p>
        )}
      </div>
    );
  }

  if (questions) {
    return (
      <div>
        <p className="small fw-medium text-body-secondary mb-1">Interview questions</p>
        <p className="small text-body-secondary mb-2">
          Paste the copy below into a calendar invite, scheduling tool, or doc for participants.
        </p>
        <InterviewGuideActions
          questions={questions}
          activityId={activityId}
          insightId={insightId}
          isComplete={isComplete}
          hasAnthropicKey={hasAnthropicKey}
        />
        <ol className="ps-4 mb-0">
          {questions.map((q, i) => (
            <li key={i} className="small mb-2" style={{ lineHeight: 1.6 }}>
              {q}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="text-center py-2">
      <p className="small text-body-secondary text-start mb-3">
        No questions yet. When you run the AI, Claude uses this insight’s title, description, and type to produce
        open-ended questions you can drop into a scheduling tool.
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
          Set <code className="small">ANTHROPIC_API_KEY</code> in the app environment to generate questions with
          Claude.
        </p>
      )}
    </div>
  );
}
