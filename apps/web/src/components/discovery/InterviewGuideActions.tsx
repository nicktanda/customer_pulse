"use client";

import { useCallback, useState } from "react";
import { formatInterviewQuestionsForCopy } from "@/lib/discovery-interview-guide";
import { draftActivityWithAIAction } from "@/app/app/discover/actions";

type InterviewGuideActionsProps = {
  /** Numbered for clipboard export */
  questions: string[];
  activityId: number;
  insightId: number;
  /** When true, hide Regenerate (activity is done). */
  isComplete: boolean;
  /** If false, “Regenerate with AI” is hidden (copy still works; key is not needed for the clipboard). */
  hasAnthropicKey: boolean;
};

/**
 * Client-only controls: copy the whole guide as plain text, or re-run the draft
 * with a confirmation step so an accidental click does not overwrite good content.
 */
export function InterviewGuideActions({
  questions,
  activityId,
  insightId,
  isComplete,
  hasAnthropicKey,
}: InterviewGuideActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = useCallback(async () => {
    const text = formatInterviewQuestionsForCopy(questions);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
    }
  }, [questions]);

  return (
    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleCopy}>
        Copy all questions
      </button>
      {copyState === "copied" ? (
        <span className="small text-success">Copied to clipboard</span>
      ) : null}
      {copyState === "error" ? (
        <span className="small text-warning">Copy failed — try again or copy manually from the list.</span>
      ) : null}

      {!isComplete && hasAnthropicKey ? (
        <form
          action={draftActivityWithAIAction}
          onSubmit={(e) => {
            if (
              !window.confirm(
                "Regenerate the interview questions with AI? This replaces the current list in the database.",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="activity_id" value={activityId} />
          <input type="hidden" name="insight_id" value={insightId} />
          <button type="submit" className="btn btn-sm btn-outline-primary">
            Regenerate with AI
          </button>
        </form>
      ) : null}
    </div>
  );
}
