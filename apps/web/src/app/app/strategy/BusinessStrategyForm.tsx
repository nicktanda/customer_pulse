"use client";

import { useState, useTransition } from "react";
import { Save, Sparkles } from "lucide-react";
import { AiSuggestion } from "@/components/ai/AiSuggestion";
import { draftStrategyFromThemesAction, updateBusinessStrategyAction } from "./actions";

/**
 * Item 2: business objectives + strategy form with a "Draft from feedback themes" button.
 *
 * The textareas are React-controlled so the AI draft can populate them in place. On submit the
 * standard server action runs; on draft the action returns JSON which we splice into local state.
 */
export function BusinessStrategyForm({
  initialObjectives,
  initialStrategy,
}: {
  initialObjectives: string;
  initialStrategy: string;
}) {
  const [objectives, setObjectives] = useState(initialObjectives);
  const [strategy, setStrategy] = useState(initialStrategy);
  const [draft, setDraft] = useState<{ objectives: string; strategy: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDraftClick() {
    setError(null);
    startTransition(async () => {
      const res = await draftStrategyFromThemesAction();
      if (!res.ok) {
        setError(
          res.error === "no_context"
            ? "Need at least one insight or theme before drafting."
            : "Drafting failed — check Anthropic key in Settings.",
        );
        return;
      }
      setDraft({
        objectives: res.objectives ?? "",
        strategy: res.strategy ?? "",
        confidence: res.confidence ?? 0.5,
      });
    });
  }

  function acceptDraft() {
    if (!draft) return;
    setObjectives(draft.objectives);
    setStrategy(draft.strategy);
    setDraft(null);
  }

  return (
    <form action={updateBusinessStrategyAction} className="d-flex flex-column gap-3 mt-4">
      <div className="d-flex justify-content-end">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
          onClick={onDraftClick}
          disabled={pending}
        >
          <Sparkles size={14} aria-hidden="true" />
          {pending ? "Drafting…" : "Draft from feedback themes"}
        </button>
      </div>

      {error ? <div className="alert alert-warning small mb-0">{error}</div> : null}

      {draft ? (
        <AiSuggestion
          confidence={draft.confidence}
          actions={
            <>
              <button type="button" className="btn btn-success btn-sm" onClick={acceptDraft}>
                Use this draft
              </button>
              <button type="button" className="btn btn-link btn-sm" onClick={() => setDraft(null)}>
                Discard
              </button>
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={onDraftClick}
                disabled={pending}
              >
                Regenerate
              </button>
            </>
          }
        >
          <p className="small fw-medium text-body-emphasis mb-1">Objectives</p>
          <pre className="small text-body-secondary mb-2" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {draft.objectives}
          </pre>
          <p className="small fw-medium text-body-emphasis mb-1">Strategy</p>
          <pre className="small text-body-secondary mb-0" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {draft.strategy}
          </pre>
        </AiSuggestion>
      ) : null}

      <div>
        <label htmlFor="business_objectives" className="form-label fw-semibold small mb-1">
          Objectives
        </label>
        <p className="small text-body-tertiary mb-2">
          What does success look like? e.g. grow enterprise adoption, reduce churn in Q2.
        </p>
        <textarea
          id="business_objectives"
          name="business_objectives"
          className="form-control"
          rows={5}
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder="e.g. Grow enterprise adoption, reduce churn in Q2…"
        />
      </div>
      <div>
        <label htmlFor="business_strategy" className="form-label fw-semibold small mb-1">
          Strategy
        </label>
        <p className="small text-body-tertiary mb-2">
          How will you get there? Themes, bets, trade-offs, and things you are not doing.
        </p>
        <textarea
          id="business_strategy"
          name="business_strategy"
          className="form-control"
          rows={5}
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          placeholder="How you plan to get there — themes, bets, non-goals…"
        />
      </div>
      <div>
        <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2">
          <Save size={14} aria-hidden="true" />
          Save business strategy
        </button>
      </div>
    </form>
  );
}
