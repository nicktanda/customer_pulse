"use client";

/**
 * Shows bulk-update controls only when at least two rows are checked.
 * The list `<form>` uses a stable id so we can count `name="feedback_ids"` checkboxes after hydration.
 */
import { useEffect, useState, type ReactNode } from "react";

export const FEEDBACK_LIST_BULK_FORM_ID = "feedback-list-bulk-form";

export function FeedbackBulkToolbarGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = document.getElementById(FEEDBACK_LIST_BULK_FORM_ID);
    if (!form || !(form instanceof HTMLFormElement)) {
      return;
    }

    const sync = () => {
      const n = form.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name="feedback_ids"]:checked',
      ).length;
      setShow(n >= 2);
    };

    sync();
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, []);

  if (!show) {
    return null;
  }

  return <>{children}</>;
}
