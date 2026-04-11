"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { InlineAlert } from "@/components/ui";
import { NlResultCharts } from "./NlResultCharts";
import { parseReportStructured } from "@/lib/reporting-structured";

type PollPayload = {
  id: number;
  status: string;
  outputMode: string;
  resultMarkdown: string | null;
  resultStructured: unknown;
  errorMessage: string | null;
};

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * Ask the worker (via BullMQ) to answer in plain text or return chart-ready JSON + narrative.
 * Polls until done/failed, then refreshes the server-rendered history list.
 * User can cancel a long-running poll; progress is shown with a live region for screen readers.
 */
export function ReportingNlAssistant() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [prompt, setPrompt] = useState("");
  const [outputMode, setOutputMode] = useState<"answer" | "report_chart">("answer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PollPayload | null>(null);
  /** Short status line while the request is in flight (also announced politely to assistive tech). */
  const [progressText, setProgressText] = useState("");

  const poll = useCallback(async (id: number, signal: AbortSignal): Promise<PollPayload> => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`/api/app/reporting/requests/${id}`);
      const data = (await res.json()) as PollPayload & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (data.status === "done" || data.status === "failed") {
        return data;
      }
      const waitSeconds = Math.round((i + 1) * 1.5);
      const phaseHint =
        data.status === "running"
          ? "Generating your answer"
          : data.status === "pending"
            ? "Queued"
            : "Processing";
      setProgressText(`${phaseHint}… (~${waitSeconds}s elapsed)`);
      await sleep(1500, signal);
    }
    throw new Error("Timed out waiting for the report — check the worker and Redis.");
  }, []);

  const onCancel = () => {
    abortRef.current?.abort();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);
    setProgressText("Sending your question…");
    try {
      const res = await fetch("/api/app/reporting/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, outputMode }),
        signal,
      });
      const data = (await res.json()) as { id?: number; error?: string; status?: string };
      if (res.status === 503 || !res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (data.id == null) {
        throw new Error("No request id returned");
      }
      setProgressText("Job started — waiting for the worker…");
      const final = await poll(data.id, signal);
      setResult(final);
      setProgressText("");
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(null);
        setProgressText("Cancelled.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setProgressText("");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const structured =
    result?.outputMode === "report_chart" && result.resultStructured
      ? parseReportStructured(result.resultStructured)
      : null;

  return (
    <div className="card border-secondary-subtle shadow-sm">
      <div className="card-body">
        <h2 className="h5 text-body-emphasis">Ask about your feedback (natural language)</h2>
        <p className="small text-body-secondary">
          Questions run in the background on the worker using a <strong>fixed summary</strong> of your project’s
          feedback (counts, recent snippets, themes) — not the full database. Choose a quick answer or a report with
          charts.
        </p>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="d-flex flex-column gap-3 mt-3"
          aria-busy={loading}
        >
          <div>
            <label htmlFor="nl_prompt" className="form-label small fw-medium">
              Your question
            </label>
            <textarea
              id="nl_prompt"
              className="form-control"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "What themes stand out this month?" or "Summarize volume vs last week"'
              required
              disabled={loading}
            />
          </div>
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <span className="small fw-medium text-body-secondary">Output</span>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="outputMode"
                id="mode_answer"
                checked={outputMode === "answer"}
                onChange={() => setOutputMode("answer")}
                disabled={loading}
              />
              <label className="form-check-label small" htmlFor="mode_answer">
                Quick answer (markdown text)
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="outputMode"
                id="mode_report"
                checked={outputMode === "report_chart"}
                onChange={() => setOutputMode("report_chart")}
                disabled={loading}
              />
              <label className="form-check-label small" htmlFor="mode_report">
                Report + charts (structured JSON the UI can graph)
              </label>
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Working…
                </>
              ) : (
                "Run"
              )}
            </button>
            {loading ? (
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        {progressText ? (
          <p className="small text-body-secondary mb-0 mt-3" role="status" aria-live="polite">
            {progressText}
          </p>
        ) : null}

        {error ? (
          <InlineAlert variant="danger" className="mt-3">
            {error}
          </InlineAlert>
        ) : null}

        {result?.status === "failed" && result.errorMessage ? (
          <InlineAlert variant="warning" className="mt-3" role="status">
            {result.errorMessage}
          </InlineAlert>
        ) : null}

        {result?.status === "done" && result.resultMarkdown ? (
          <div className="mt-4">
            <h3 className="h6 text-body-emphasis">Result</h3>
            <div
              className="border rounded p-3 bg-body-secondary bg-opacity-25 small"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {result.resultMarkdown}
            </div>
            {structured && structured.charts.length > 0 ? (
              <div className="mt-4">
                <h3 className="h6 text-body-emphasis">Charts</h3>
                <NlResultCharts structured={structured} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
