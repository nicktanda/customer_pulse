"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { AiSuggestion } from "@/components/ai/AiSuggestion";
import { FormActions, NarrowCardForm } from "@/components/ui";
import { createProjectAction, inferProjectFromHintAction } from "../actions";

/**
 * Item 8: project creation with optional "Help me name this" AI pre-step.
 *
 * The user types a short hint (URL, repo name, or plain-English description) and the AI proposes
 * a polished name + description. Hint is non-secret — never sends integration tokens.
 */
export function NewProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");
  const [draft, setDraft] = useState<{ name: string; description: string; confidence: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onInfer() {
    setError(null);
    if (hint.trim().length < 4) {
      setError("Add a few words first.");
      return;
    }
    startTransition(async () => {
      const res = await inferProjectFromHintAction(hint);
      if (!res.ok) {
        setError(res.error === "ai_unavailable" ? "AI unavailable — fill manually." : "Could not infer.");
        return;
      }
      setDraft({
        name: res.name ?? "",
        description: res.description ?? "",
        confidence: res.confidence ?? 0.5,
      });
    });
  }

  function accept() {
    if (!draft) return;
    setName(draft.name);
    setDescription(draft.description);
    setDraft(null);
  }

  return (
    <NarrowCardForm action={createProjectAction} className="mt-4">
      <div>
        <label htmlFor="proj-hint" className="form-label small">
          Help me name this <span className="text-body-tertiary fw-normal">(optional)</span>
        </label>
        <div className="d-flex gap-2">
          <input
            id="proj-hint"
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. acme/mobile-app, or 'consumer checkout flow'"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 flex-shrink-0"
            onClick={onInfer}
            disabled={pending}
          >
            <Sparkles size={14} aria-hidden="true" />
            {pending ? "…" : "Suggest"}
          </button>
        </div>
        <div className="form-text">A repo URL, integration name, or short description. No secrets.</div>
      </div>

      {error ? <div className="alert alert-warning small mb-0">{error}</div> : null}

      {draft ? (
        <AiSuggestion
          confidence={draft.confidence}
          actions={
            <>
              <button type="button" className="btn btn-success btn-sm" onClick={accept}>
                Use this
              </button>
              <button type="button" className="btn btn-link btn-sm" onClick={() => setDraft(null)}>
                Discard
              </button>
            </>
          }
        >
          <p className="small fw-medium text-body-emphasis mb-1">Name</p>
          <p className="small text-body-secondary mb-2">{draft.name}</p>
          <p className="small fw-medium text-body-emphasis mb-1">Description</p>
          <p className="small text-body-secondary mb-0">{draft.description}</p>
        </AiSuggestion>
      ) : null}

      <div>
        <label htmlFor="new-proj-name" className="form-label">
          Name
        </label>
        <input
          id="new-proj-name"
          name="name"
          required
          className="form-control"
          placeholder="Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="new-proj-desc" className="form-label">
          Description (optional)
        </label>
        <textarea
          id="new-proj-desc"
          name="description"
          rows={3}
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <FormActions variant="plain">
        <button type="submit" className="btn btn-primary">
          Create project
        </button>
      </FormActions>
    </NarrowCardForm>
  );
}
