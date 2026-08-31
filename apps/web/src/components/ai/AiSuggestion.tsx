/**
 * Infra-1: shared "AI drafted this — Accept / Edit / Regenerate" UI primitive.
 *
 * Used wherever the app shows an AI-drafted artefact the user can confirm.
 * Pure presentation — server actions handle the accept/regen calls.
 */

import { Sparkles } from "lucide-react";
import { type ReactNode } from "react";

export type ConfidenceLevel = "high" | "medium" | "low";

export function confidenceLevel(score: number | null | undefined): ConfidenceLevel {
  if (score == null) return "low";
  if (score >= 0.85) return "high";
  if (score >= 0.75) return "medium";
  return "low";
}

function dotClass(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "bg-success";
    case "medium":
      return "bg-warning";
    case "low":
      return "bg-danger";
  }
}

function levelLabel(level: ConfidenceLevel, score: number | null | undefined): string {
  const pct = score == null ? "—" : `${Math.round(score * 100)}%`;
  if (level === "high") return `High confidence (${pct})`;
  if (level === "medium") return `Medium confidence (${pct})`;
  return `Low confidence (${pct})`;
}

/**
 * Wraps an AI-drafted field group with a confidence dot and action row.
 * The form actions are passed in as children so the consumer keeps full control of submit semantics.
 */
export function AiSuggestion({
  confidence,
  reasoning,
  children,
  actions,
  className,
}: {
  confidence: number | null | undefined;
  /** Optional one-line "why this?" hint shown next to the confidence dot. */
  reasoning?: string;
  children: ReactNode;
  /** The form's accept / edit / regenerate buttons. Owned by the consumer. */
  actions?: ReactNode;
  className?: string;
}) {
  const level = confidenceLevel(confidence);
  return (
    <div
      className={`ai-suggestion border border-secondary-subtle rounded-3 p-3 ${className ?? ""}`}
      style={{ background: "rgba(var(--bs-primary-rgb), 0.04)" }}
      data-ai-source="suggestion"
    >
      <div className="d-flex align-items-center gap-2 mb-2 small text-body-secondary">
        <Sparkles size={14} aria-hidden="true" />
        <span className="fw-medium text-body-emphasis">AI suggestion</span>
        <span
          className={`d-inline-block rounded-circle ${dotClass(level)}`}
          style={{ width: 8, height: 8 }}
          aria-label={levelLabel(level, confidence)}
          title={levelLabel(level, confidence)}
        />
        <span className="text-body-tertiary">{levelLabel(level, confidence)}</span>
        {reasoning ? (
          <span className="text-body-tertiary ms-1" title={reasoning}>
            · {reasoning.length > 60 ? `${reasoning.slice(0, 57)}…` : reasoning}
          </span>
        ) : null}
      </div>
      <div className="ai-suggestion-body">{children}</div>
      {actions ? <div className="d-flex gap-2 mt-3 flex-wrap">{actions}</div> : null}
    </div>
  );
}

/**
 * A small inline confidence badge — used in dense lists where AiSuggestion would be too heavy.
 */
export function ConfidenceBadge({ score, hideLabel }: { score: number | null | undefined; hideLabel?: boolean }) {
  const level = confidenceLevel(score);
  const label = levelLabel(level, score);
  return (
    <span className="d-inline-flex align-items-center gap-1 small text-body-tertiary" title={label}>
      <span
        className={`d-inline-block rounded-circle ${dotClass(level)}`}
        style={{ width: 8, height: 8 }}
        aria-label={label}
      />
      {hideLabel ? null : <span>{label}</span>}
    </span>
  );
}
