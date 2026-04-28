"use client";

import { useCallback, useState } from "react";

/**
 * One row from the AI-drafted assumption map (stored as JSON in the activity).
 * `risk_level` is optional so older saved drafts (before we asked Claude for it) still render.
 */
export type AssumptionRow = {
  assumption: string;
  why_it_matters: string;
  how_to_test: string;
  risk_level?: string;
};

/**
 * Escapes characters that would break a Markdown pipe table (pipes and newlines in cells).
 */
function escapeTableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * Maps optional risk labels from Claude to Bootstrap badge classes.
 * Unknown values are ignored so we never show a broken badge.
 */
function riskBadgeClass(risk: string | undefined): string | null {
  if (!risk) return null;
  const r = risk.toLowerCase();
  if (r === "high") return "text-bg-danger";
  if (r === "medium") return "text-bg-warning";
  if (r === "low") return "text-bg-success";
  return null;
}

type Props = {
  assumptions: AssumptionRow[];
};

/**
 * Renders the assumption map (cards) plus "Copy as Markdown" and "Print" for PM workflows.
 * Print uses `window.print()`; matching `@media print` rules live in `globals.css` (`.assumption-map-print-area`).
 */
export function AssumptionMapContent({ assumptions }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

  const markdownTable = useCallback(() => {
    const lines = [
      "| Assumption | Why it matters | How to test |",
      "| --- | --- | --- |",
      ...assumptions.map(
        (a) =>
          `| ${escapeTableCell(a.assumption)} | ${escapeTableCell(a.why_it_matters)} | ${escapeTableCell(
            a.how_to_test,
          )} |`,
      ),
    ];
    return lines.join("\n");
  }, [assumptions]);

  const handleCopy = async () => {
    setCopyState("idle");
    try {
      await navigator.clipboard.writeText(markdownTable());
      setCopyState("ok");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("err");
    }
  };

  const handlePrint = () => {
    // Toggles a class on <html> so @media print can hide the rest of the app only during this print job.
    const root = document.documentElement;
    const endPrint = () => {
      root.removeEventListener("afterprint", endPrint);
      root.classList.remove("assumption-map-print-mode");
    };
    root.classList.add("assumption-map-print-mode");
    root.addEventListener("afterprint", endPrint);
    window.print();
  };

  return (
    <div>
      {copyState === "ok" ? (
        <p className="small text-success mb-2 assumption-map-no-print">Copied to clipboard.</p>
      ) : null}
      {copyState === "err" ? (
        <p className="small text-danger mb-2 assumption-map-no-print">Could not copy — try selecting the table in a doc.</p>
      ) : null}

      <div className="assumption-map-print-area d-flex flex-column gap-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0">
          <p className="small fw-medium text-body-secondary mb-0">Assumptions to test</p>
          <div className="d-flex flex-wrap gap-1 assumption-map-no-print">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCopy}>
              Copy as Markdown table
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handlePrint}>
              Print
            </button>
          </div>
        </div>
        {assumptions.map((a, i) => {
          const riskClass = riskBadgeClass(a.risk_level);
          return (
            <div
              key={i}
              className="p-2 rounded"
              style={{ background: "var(--bs-body-bg)", border: "1px solid var(--bs-border-color)" }}
            >
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <p className="small fw-medium mb-0 flex-grow-1">{a.assumption}</p>
                {riskClass ? (
                  <span className={`badge ${riskClass}`} style={{ fontSize: "0.65rem" }}>
                    Risk: {a.risk_level}
                  </span>
                ) : null}
              </div>
              <p className="small text-body-secondary mb-1">
                <span className="fw-medium">Why it matters:</span> {a.why_it_matters}
              </p>
              <p className="small text-body-secondary mb-0">
                <span className="fw-medium">How to test:</span> {a.how_to_test}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
