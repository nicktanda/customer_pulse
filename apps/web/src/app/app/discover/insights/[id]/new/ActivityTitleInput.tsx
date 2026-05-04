"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { ConfidenceBadge } from "@/components/ai/AiSuggestion";
import { suggestActivityTitleAction } from "../../../actions";

/**
 * Item 4: title input for new discovery activities. Auto-fetches an AI suggestion on mount,
 * pre-fills the input. User can edit, regenerate, or clear.
 */
export function ActivityTitleInput({
  insightId,
  activityType,
  placeholder,
}: {
  insightId: number;
  activityType: number;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function fetchSuggestion() {
    startTransition(async () => {
      const res = await suggestActivityTitleAction(insightId, activityType);
      if (res.title) {
        setValue(res.title);
        setConfidence(res.confidence);
      }
    });
  }

  useEffect(() => {
    fetchSuggestion();
    // Once on mount; the insight + type don't change while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center justify-content-between">
        <label htmlFor="title" className="form-label fw-medium mb-0">
          Title <span className="text-body-secondary fw-normal">(optional)</span>
        </label>
        <div className="d-flex align-items-center gap-2">
          {confidence != null ? <ConfidenceBadge score={confidence} hideLabel /> : null}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 d-inline-flex align-items-center gap-1"
            onClick={fetchSuggestion}
            disabled={pending}
          >
            <Sparkles size={12} aria-hidden="true" />
            {pending ? "Drafting…" : "Suggest title"}
          </button>
        </div>
      </div>
      <input
        id="title"
        name="title"
        type="text"
        className="form-control mt-1"
        placeholder={placeholder}
        maxLength={255}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="form-text">
        Leave blank to use the default name for this activity type. Edit the AI suggestion freely.
      </div>
    </div>
  );
}
