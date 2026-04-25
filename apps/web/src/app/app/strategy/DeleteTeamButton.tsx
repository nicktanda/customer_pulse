"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTeamAction } from "./actions";

type Props = {
  teamId: number;
  teamName: string;
};

/**
 * Small trash-icon button that opens an inline confirmation popup before
 * deleting the team. No window.confirm() — fully styled, keyboard-accessible.
 */
export function DeleteTeamButton({ teamId, teamName }: Props) {
  // Whether the confirmation popup is visible
  const [open, setOpen] = useState(false);

  // Tracks if the delete server action is running
  const [isPending, startTransition] = useTransition();

  // Ref for the wrapper so we can detect clicks outside and close the popup
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close popup when the user clicks somewhere outside it
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleConfirmDelete() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(teamId));
      await deleteTeamAction(formData);
    });
  }

  return (
    // position: relative so the popup anchors to this element
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-sm btn-link p-0 text-body-tertiary"
        title={`Remove ${teamName}`}
        aria-label={`Remove team ${teamName}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Trash2 size={15} />
      </button>

      {/* Confirmation popup — appears below the trash icon */}
      {open && (
        <div
          role="dialog"
          aria-label={`Confirm removal of ${teamName}`}
          className="card border-secondary-subtle shadow-sm p-3"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            minWidth: "230px",
          }}
        >
          <p className="small text-body-secondary mb-2">
            Remove &ldquo;{teamName}&rdquo;?{" "}
            <span className="text-body-tertiary">This cannot be undone.</span>
          </p>
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="btn btn-sm btn-danger"
              // autoFocus so keyboard users can confirm straight away
              autoFocus
            >
              {isPending ? "Removing…" : "Remove"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="btn btn-sm btn-outline-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
