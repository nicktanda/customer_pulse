"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { AiSuggestion } from "@/components/ai/AiSuggestion";
import { FormActions, NarrowCardForm } from "@/components/ui";
import {
  createSpecAction,
  draftSpecFromInsightsAction,
  suggestInsightsForTextAction,
} from "../../actions";
import { SpecSubmitButton } from "./SpecSubmitButton";

/**
 * Item 5: bidirectional spec drafting form.
 *  - Click "Draft from selected insights" once any insight checkbox is ticked → AI fills title/description.
 *  - Type a description ≥ 12 chars → debounced suggestion of related insights as a pill.
 */
export function SpecFormClient({
  projectInsights,
  prefillTitle,
  fromInsightId,
}: {
  projectInsights: { id: number; title: string }[];
  prefillTitle: string;
  fromInsightId: number | null;
}) {
  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(fromInsightId ? [fromInsightId] : []),
  );
  const [draft, setDraft] = useState<{ title: string; description: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [suggestedIds, setSuggestedIds] = useState<number[]>([]);

  // Debounced "what insights might this match?" lookup once user has typed ~3 words.
  useEffect(() => {
    const text = `${title} ${description}`.trim();
    if (text.length < 12) {
      setSuggestedIds([]);
      return;
    }
    const handle = setTimeout(() => {
      void suggestInsightsForTextAction(text).then((res) => {
        setSuggestedIds(res.ids.filter((id) => !selected.has(id)));
      });
    }, 600);
    return () => clearTimeout(handle);
  }, [title, description, selected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onDraftClick() {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one insight first.");
      return;
    }
    startTransition(async () => {
      const res = await draftSpecFromInsightsAction([...selected]);
      if (!res.ok) {
        setError(res.error === "ai_unavailable" ? "AI unavailable — check Anthropic key." : "Drafting failed.");
        return;
      }
      setDraft({
        title: res.title ?? "",
        description: res.description ?? "",
        confidence: res.confidence ?? 0.5,
      });
    });
  }

  function acceptDraft() {
    if (!draft) return;
    setTitle(draft.title);
    setDescription(draft.description);
    setDraft(null);
  }

  return (
    <NarrowCardForm action={createSpecAction} className="mt-4">
      {/* Insight-driven drafter — only relevant when at least one insight is selectable. */}
      {projectInsights.length > 0 ? (
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
            onClick={onDraftClick}
            disabled={pending}
          >
            <Sparkles size={14} aria-hidden="true" />
            {pending ? "Drafting…" : "Draft from selected insights"}
          </button>
        </div>
      ) : null}

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
            </>
          }
        >
          <p className="small fw-medium text-body-emphasis mb-1">Title</p>
          <p className="small text-body-secondary mb-2">{draft.title}</p>
          <p className="small fw-medium text-body-emphasis mb-1">Description</p>
          <p className="small text-body-secondary mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {draft.description}
          </p>
        </AiSuggestion>
      ) : null}

      {/* Title */}
      <div>
        <label htmlFor="spec-title" className="form-label">
          Title <span className="text-danger">*</span>
        </label>
        <input
          id="spec-title"
          name="title"
          required
          className="form-control"
          placeholder="e.g. Allow users to export feedback as CSV"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="form-text">A clear, outcome-focused title for the spec.</div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="spec-description" className="form-label">
          Description <span className="text-body-tertiary small">(optional)</span>
        </label>
        <textarea
          id="spec-description"
          name="description"
          rows={4}
          className="form-control"
          placeholder="What problem does this solve? Who is it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Suggested insights pill */}
      {suggestedIds.length > 0 ? (
        <div className="small text-body-secondary">
          Looks related —{" "}
          {suggestedIds.map((id) => {
            const insight = projectInsights.find((i) => i.id === id);
            if (!insight) return null;
            return (
              <button
                key={id}
                type="button"
                className="btn btn-sm btn-outline-secondary me-1 mb-1"
                onClick={() => toggle(id)}
              >
                + {insight.title.length > 40 ? `${insight.title.slice(0, 37)}…` : insight.title}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Linked insights — the golden thread */}
      <div>
        <label className="form-label d-block">
          Linked insights <span className="text-body-tertiary small">(optional)</span>
        </label>
        {projectInsights.length === 0 ? (
          <p className="small text-body-secondary mb-0">
            No insights found for this project yet. Insights are generated automatically from customer feedback.
          </p>
        ) : (
          <>
            <div
              className="border border-secondary-subtle rounded overflow-y-auto"
              style={{ maxHeight: "16rem" }}
            >
              <ul className="list-group list-group-flush">
                {projectInsights.map((insight) => (
                  <li key={insight.id} className="list-group-item">
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="insight_ids"
                        value={insight.id}
                        id={`insight-${insight.id}`}
                        checked={selected.has(insight.id)}
                        onChange={() => toggle(insight.id)}
                      />
                      <label
                        className="form-check-label small text-body"
                        htmlFor={`insight-${insight.id}`}
                      >
                        {insight.title}
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="form-text">
              Select the insight(s) this spec addresses — this is the golden thread linking customer
              evidence to your build work.
            </div>
          </>
        )}
      </div>

      <FormActions variant="plain">
        <SpecSubmitButton />
        <p className="small text-body-secondary mb-0 mt-2">
          Claude will draft user stories, acceptance criteria, and success metrics automatically.
        </p>
      </FormActions>
    </NarrowCardForm>
  );
}
