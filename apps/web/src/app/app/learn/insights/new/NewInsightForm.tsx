"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { AiSuggestion, ConfidenceBadge } from "@/components/ai/AiSuggestion";
import { FormActions, NarrowCardForm } from "@/components/ui";
import {
  createInsightAction,
  draftInsightFromFeedbackAction,
  findSimilarInsightAction,
} from "../actions";

export function NewInsightForm({
  initialTitle,
  initialDescription,
  initialConfidence,
  seedFeedbackIds,
}: {
  initialTitle: string;
  initialDescription: string;
  initialConfidence: number | null;
  seedFeedbackIds: number[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [similar, setSimilar] = useState<{ id: number; title: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Debounced check: warn if a similar-titled insight already exists.
  useEffect(() => {
    if (title.trim().length < 6) {
      setSimilar(null);
      return;
    }
    const handle = setTimeout(() => {
      void findSimilarInsightAction(title).then(setSimilar);
    }, 500);
    return () => clearTimeout(handle);
  }, [title]);

  function regenerate() {
    if (seedFeedbackIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await draftInsightFromFeedbackAction(seedFeedbackIds);
      if (!res.ok) {
        setError("Could not draft — check Anthropic key.");
        return;
      }
      setTitle(res.title ?? title);
      setDescription(res.description ?? description);
    });
  }

  return (
    <NarrowCardForm action={createInsightAction} className="mt-4">
      {seedFeedbackIds.length > 0 && initialConfidence != null ? (
        <AiSuggestion
          confidence={initialConfidence}
          reasoning={`Drafted from ${seedFeedbackIds.length} feedback item${seedFeedbackIds.length === 1 ? "" : "s"}`}
          actions={
            <button type="button" className="btn btn-link btn-sm" onClick={regenerate} disabled={pending}>
              <Sparkles size={14} className="me-1" aria-hidden="true" />
              {pending ? "Regenerating…" : "Regenerate"}
            </button>
          }
        >
          <p className="small text-body-secondary mb-0">
            Title and description below are AI-drafted — edit anything before saving.
          </p>
        </AiSuggestion>
      ) : null}

      {error ? <div className="alert alert-warning small mb-0">{error}</div> : null}

      {similar ? (
        <div className="alert alert-info small mb-0">
          Looks similar to <a href={`/app/learn/insights/${similar.id}`}>insight #{similar.id}</a> — &ldquo;
          {similar.title}&rdquo;. Consider editing that one instead of duplicating.
          <ConfidenceBadge score={0.8} hideLabel />
        </div>
      ) : null}

      <div>
        <label htmlFor="insight-title" className="form-label">
          Title <span className="text-danger">*</span>
        </label>
        <input
          id="insight-title"
          name="title"
          required
          maxLength={255}
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Export fails for accounts with >10k feedback items"
        />
      </div>

      <div>
        <label htmlFor="insight-description" className="form-label">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id="insight-description"
          name="description"
          required
          rows={5}
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the customer problem? Who is affected? Why does it matter?"
        />
      </div>

      <FormActions variant="plain">
        <button type="submit" className="btn btn-primary">
          Create insight
        </button>
      </FormActions>
    </NarrowCardForm>
  );
}
