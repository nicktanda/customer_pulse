"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { updateSurveyDraftAction } from "@/app/app/discover/actions";
import {
  serializeSurveyToMarkdown,
  serializeSurveyToText,
  type SurveyContent,
  type SurveyQuestion,
} from "@/lib/discovery-survey";

type Props = {
  /** Parsed, valid survey — server only passes this when JSON matches rules (or legacy rows are edited after first save). */
  initial: SurveyContent;
  activityId: number;
  insightId: number;
  /** When the activity is marked complete, hide editing and Save — exports still work. */
  readOnly: boolean;
};

/**
 * Survey activity (type 2): inline edits, participant preview, and export helpers.
 * Keeps structured data in `ai_generated_content` via `updateSurveyDraftAction`, not in findings.
 */
export function SurveyActivityPanel({ initial, activityId, insightId, readOnly }: Props) {
  const [draft, setDraft] = useState<SurveyContent>(() => ({
    questions: initial.questions.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined })),
    human_edited: initial.human_edited,
  }));
  const [message, setMessage] = useState<string | null>(null);
  // useTransition marks updates that might be slow (here: the server action) so React can keep the UI responsive.
  const [isPending, startTransition] = useTransition();

  // Snapshot of the draft in the shape the server expects (trimmed strings, optional fields omitted when empty).
  const asPayload = useMemo(
    () => ({
      questions: draft.questions.map((q) => ({
        question: q.question,
        type: q.type,
        ...(q.options?.length ? { options: q.options } : {}),
        ...(q.scale_min_label ? { scale_min_label: q.scale_min_label } : {}),
        ...(q.scale_max_label ? { scale_max_label: q.scale_max_label } : {}),
      })),
      human_edited: true as const,
    }),
    [draft.questions],
  );

  const updateQuestion = useCallback((index: number, patch: Partial<SurveyQuestion>) => {
    setDraft((prev) => {
      const questions = [...prev.questions];
      const cur = { ...questions[index]!, ...patch };
      questions[index] = cur;
      return { ...prev, questions };
    });
    setMessage(null);
  }, []);

  const setOptionsFromText = useCallback((index: number, text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    updateQuestion(index, { options: lines.length ? lines : undefined });
  }, [updateQuestion]);

  const save = useCallback(() => {
    setMessage(null);
    startTransition(async () => {
      // Server actions work like form posts: we pack fields into FormData and the server validates + writes to Postgres.
      const fd = new FormData();
      fd.set("activity_id", String(activityId));
      fd.set("insight_id", String(insightId));
      fd.set("survey_json", JSON.stringify(asPayload));
      await updateSurveyDraftAction(fd);
      setMessage("Saved.");
    });
  }, [activityId, insightId, asPayload]);

  const copyText = useCallback(async () => {
    const text = serializeSurveyToText(asPayload);
    await navigator.clipboard.writeText(text);
    setMessage("Copied plain text.");
  }, [asPayload]);

  const copyMarkdown = useCallback(async () => {
    const md = serializeSurveyToMarkdown(asPayload);
    await navigator.clipboard.writeText(md);
    setMessage("Copied Markdown.");
  }, [asPayload]);

  const downloadTxt = useCallback(() => {
    const text = serializeSurveyToText(asPayload);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey-activity-${activityId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Download started.");
  }, [activityId, asPayload]);

  return (
    <div className="d-flex flex-column gap-4">
      {/* Export row — flex-wrap so buttons don’t overflow on narrow screens */}
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <span className="small fw-medium text-body-secondary me-1">Export</span>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void copyText()}>
          Copy plain text
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void copyMarkdown()}>
          Copy Markdown
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={downloadTxt}>
          Download .txt
        </button>
        {message ? (
          <span className="small text-success ms-1" role="status">
            {message}
          </span>
        ) : null}
      </div>

      {!readOnly ? (
        <div>
          <p className="small fw-medium text-body-secondary mb-2">Edit before you send</p>
          <div className="d-flex flex-column gap-3">
            {draft.questions.map((q, i) => (
              <div
                key={i}
                className="p-3 rounded"
                style={{ border: "1px solid var(--bs-border-color)", background: "var(--bs-body-bg)" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2 gap-2 flex-wrap">
                  <span className="small fw-semibold">Question {i + 1}</span>
                  <span className="badge bg-body-secondary text-body-secondary border border-secondary-subtle" style={{ fontSize: "0.65rem" }}>
                    {q.type.replace("_", " ")}
                  </span>
                </div>
                <label className="form-label small mb-1">Wording</label>
                <textarea
                  className="form-control form-control-sm mb-2"
                  rows={q.type === "open_ended" ? 3 : 2}
                  value={q.question}
                  onChange={(e) => updateQuestion(i, { question: e.target.value })}
                  disabled={readOnly}
                />
                {q.type === "likert" ? (
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <label className="form-label small mb-1">Scale label (1 / low)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={q.scale_min_label ?? ""}
                        placeholder='e.g. "Strongly disagree"'
                        onChange={(e) => updateQuestion(i, { scale_min_label: e.target.value || undefined })}
                        disabled={readOnly}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small mb-1">Scale label (5 / high)</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={q.scale_max_label ?? ""}
                        placeholder='e.g. "Strongly agree"'
                        onChange={(e) => updateQuestion(i, { scale_max_label: e.target.value || undefined })}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                ) : null}
                {q.type === "multiple_choice" ? (
                  <div>
                    <label className="form-label small mb-1">Options (one per line)</label>
                    <textarea
                      className="form-control form-control-sm font-monospace"
                      rows={4}
                      value={(q.options ?? []).join("\n")}
                      onChange={(e) => setOptionsFromText(i, e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button type="button" className="btn btn-primary btn-sm" disabled={isPending} onClick={save}>
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <p className="small text-body-secondary mt-2 mb-0">
              Saving updates the AI draft in the database so exports and your team see the latest wording.
            </p>
          </div>
        </div>
      ) : null}

      {/* Participant preview — read-only, slightly different surface so it feels like “their” view */}
      <div>
        <p className="small fw-medium text-body-secondary mb-2">Participant preview</p>
        <p className="small text-body-tertiary mb-2">
          This is what respondents would see — same questions, without editor chrome.
        </p>
        <div
          className="p-3 rounded"
          style={{
            background: "rgba(var(--bs-secondary-rgb), 0.06)",
            border: "1px dashed var(--bs-border-color)",
          }}
        >
          <ol className="ps-3 mb-0">
            {draft.questions.map((q, i) => (
              <li key={i} className="small mb-3">
                <p className="mb-1 fw-medium" style={{ lineHeight: 1.5 }}>
                  {q.question}
                </p>
                {q.type === "likert" ? (
                  <p className="small text-body-secondary mb-0 fst-italic">
                    {q.scale_min_label && q.scale_max_label
                      ? `Scale: 1 = ${q.scale_min_label} … 5 = ${q.scale_max_label}`
                      : "Likert scale (1–5)"}
                  </p>
                ) : null}
                {q.type === "multiple_choice" && q.options?.length ? (
                  <ul className="mb-0 ps-3 mt-1">
                    {q.options.map((opt, j) => (
                      <li key={j} className="text-body-secondary">
                        {opt}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {q.type === "open_ended" ? (
                  <p className="small text-body-tertiary mb-0 mt-1">Open response</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
