"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

/**
 * One competitor from Claude: display name, optional one-line relevance, and a research checklist.
 * Older saved activities may omit `why_relevant` — the UI still works.
 */
export type CompetitorScanEntry = {
  name: string;
  things_to_check: string[];
  why_relevant?: string;
};

type Props = {
  competitors: CompetitorScanEntry[];
  /** Used for “Compare positioning in Learn” — links to this insight in Learn mode */
  insightId: number;
};

/**
 * Renders the competitor research checklist with local-only checkboxes (not saved to the DB in v1),
 * a button to copy the same structure as Markdown task lists, and a tip link into Learn.
 */
export function CompetitorScanBlock({ competitors, insightId }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggle = (cIdx: number, tIdx: number) => {
    const key = `${cIdx}-${tIdx}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const markdown = useMemo(() => {
    return competitors
      .map((c) => {
        const items = Array.isArray(c.things_to_check) ? c.things_to_check : [];
        const taskLines = items.map((t) => `- [ ] ${t}`).join("\n");
        if (c.why_relevant) {
          return `## ${c.name}\n\n*${c.why_relevant}*\n\n${taskLines}`;
        }
        return `## ${c.name}\n\n${taskLines}`;
      })
      .join("\n\n");
  }, [competitors]);

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [markdown]);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <p className="small fw-medium text-body-secondary mb-0">Competitors to research</p>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => void copyMarkdown()}
        >
          {copied ? "Copied!" : "Copy as Markdown"}
        </button>
      </div>

      <div className="d-flex flex-column gap-3">
        {competitors.map((c, i) => {
          const items = Array.isArray(c.things_to_check) ? c.things_to_check : [];
          return (
            <div key={i} className="p-2 rounded" style={{ border: "1px solid var(--bs-border-color)" }}>
              <p className="small fw-medium mb-1">{c.name}</p>
              {c.why_relevant ? (
                <p className="small text-body-secondary mb-2">
                  <span className="fw-medium">Why relevant:</span> {c.why_relevant}
                </p>
              ) : null}
              <ul className="list-unstyled mb-0">
                {items.map((t, j) => {
                  const key = `${i}-${j}`;
                  return (
                    <li key={j} className="small d-flex gap-2 align-items-start">
                      <input
                        className="form-check-input flex-shrink-0 mt-1"
                        type="checkbox"
                        id={`cc-${i}-${j}`}
                        checked={!!checked[key]}
                        onChange={() => toggle(i, j)}
                        aria-label={`Research task: ${t}`}
                      />
                      <label className="form-check-label text-body-secondary" htmlFor={`cc-${i}-${j}`} style={{ cursor: "pointer" }}>
                        {t}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="small text-body-secondary mt-3 mb-0">
        <Link href={`/app/learn/insights/${insightId}`} className="link-secondary text-decoration-none">
          Compare positioning in Learn
        </Link>
        <span className="text-body-tertiary"> — see how this insight is framed next to the rest of your signal.</span>
      </p>
    </div>
  );
}
