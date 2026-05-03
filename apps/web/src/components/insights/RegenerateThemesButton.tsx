"use client";

/**
 * Button that triggers on-demand theme regeneration for the current project.
 *
 * Calls POST /api/app/insights/themes/regenerate, which enqueues a background
 * job. The themes are NOT updated instantly — the job runs asynchronously in
 * the worker. After clicking, the user sees a success notice and can reload
 * the page in a few seconds to see refreshed themes.
 */

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function RegenerateThemesButton() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    if (status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/app/insights/themes/regenerate", {
        method: "POST",
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      // Reset back to idle after a few seconds so the button is usable again
      setTimeout(() => setStatus("idle"), 6000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={handleClick}
        disabled={status === "loading" || status === "success"}
        aria-busy={status === "loading"}
      >
        {status === "loading" ? (
          <>
            {/* Spinner spins while the request is in-flight */}
            <span
              className="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            />
            Mutating themes…
          </>
        ) : status === "success" ? (
          "Queued ✓"
        ) : (
          "Regenerate themes"
        )}
      </button>

      {status === "success" ? (
        <span className="small text-body-secondary">
          Running in the background — reload in a moment to see updated themes.
        </span>
      ) : null}

      {status === "error" ? (
        <span className="small text-danger">
          Something went wrong. Please try again.
        </span>
      ) : null}
    </div>
  );
}
