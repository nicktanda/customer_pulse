"use client";

/**
 * AI-proposed discovery activities for one insight — helps the team pick **what work to run**
 * before committing to a solution in Build.
 *
 * Flow: click "Suggest plan" → server calls Claude → list appears with "Add" forms that reuse
 * `createDiscoveryActivityAction` and land back on this page (`return_to=insight`).
 */

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "react-bootstrap";
import { ConfidenceBadge } from "@/components/ai/AiSuggestion";
import {
  createDiscoveryActivityAction,
  suggestDiscoveryActivitiesForInsightAction,
} from "@/app/app/discover/actions";

function typeMeta(t: number): { icon: string; label: string } {
  switch (t) {
    case 1:
      return { icon: "💬", label: "Interview guide" };
    case 2:
      return { icon: "📋", label: "Survey" };
    case 3:
      return { icon: "🗺", label: "Assumption map" };
    case 4:
      return { icon: "🔭", label: "Competitor scan" };
    case 5:
      return { icon: "📊", label: "Data query" };
    case 6:
      return { icon: "📚", label: "Desk research" };
    case 7:
      return { icon: "💡", label: "Prototype hypothesis" };
    default:
      return { icon: "📝", label: "Activity" };
  }
}

export function InsightDiscoveryPlanPanel({ insightId }: { insightId: number }) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<
    { activityType: number; title: string; rationale: string }[] | null
  >(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runSuggest() {
    setError(null);
    setItems(null);
    setConfidence(null);
    startTransition(async () => {
      const res = await suggestDiscoveryActivitiesForInsightAction(insightId);
      if (!res.ok) {
        setError(
          res.error === "not_found"
            ? "This insight could not be loaded."
            : res.error === "ai_unavailable"
              ? "AI is not available (check Anthropic API key or integration)."
              : res.error === "empty_plan"
                ? "The model returned no valid activities. Try again or add activities manually."
                : "Could not generate a plan.",
        );
        return;
      }
      setItems(res.activities ?? []);
      setConfidence(res.confidence ?? null);
    });
  }

  return (
    <div
      className="card border-secondary-subtle mb-4"
      style={{ borderLeft: "3px solid rgba(var(--bs-primary-rgb), 0.45)" }}
    >
      <div className="card-body py-3">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-2">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <Sparkles size={18} aria-hidden className="text-primary" />
              <span className="small fw-semibold text-body-emphasis">AI-suggested discovery plan</span>
              {confidence != null ? <ConfidenceBadge score={confidence} hideLabel /> : null}
            </div>
            <p className="small text-body-secondary mb-0" style={{ maxWidth: "40rem", lineHeight: 1.5 }}>
              Get an ordered mix of qualitative and quantitative discovery work so your team can narrow{" "}
              <strong className="text-body-emphasis">what solution</strong> to invest in — not just recycle the insight
              text.
            </p>
          </div>
          <Button
            variant="outline-primary"
            size="sm"
            className="d-inline-flex align-items-center gap-1 flex-shrink-0"
            disabled={pending}
            onClick={runSuggest}
            type="button"
          >
            <Sparkles size={14} aria-hidden />
            {items ? "Regenerate plan" : "Suggest plan"}
          </Button>
        </div>

        {pending ? (
          <p className="small text-body-secondary mb-0">Drafting discovery steps…</p>
        ) : error ? (
          <p className="small text-danger mb-0">{error}</p>
        ) : items && items.length > 0 ? (
          <ul className="list-unstyled mb-0 mt-2">
            {items.map((a, idx) => {
              const meta = typeMeta(a.activityType);
              return (
                <li key={`${a.activityType}-${idx}`} className="border border-secondary-subtle rounded-2 p-3 mb-2">
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                    <div className="min-w-0">
                      <span className="me-1" aria-hidden>
                        {meta.icon}
                      </span>
                      <span className="small text-body-tertiary">{meta.label}</span>
                      <p className="fw-medium text-body-emphasis mb-1 mt-1">{a.title}</p>
                      <p className="small text-body-secondary mb-0" style={{ lineHeight: 1.55 }}>
                        {a.rationale}
                      </p>
                    </div>
                    {/* Each row is its own form so "Add" runs the same server action as manual create. */}
                    <form action={createDiscoveryActivityAction} className="flex-shrink-0">
                      <input type="hidden" name="insight_id" value={String(insightId)} />
                      <input type="hidden" name="activity_type" value={String(a.activityType)} />
                      <input type="hidden" name="title" value={a.title} />
                      <input type="hidden" name="return_to" value="insight" />
                      <Button type="submit" size="sm" variant="primary">
                        Add
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
