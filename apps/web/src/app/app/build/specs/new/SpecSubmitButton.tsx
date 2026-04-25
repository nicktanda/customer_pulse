"use client";

/**
 * Submit button for the new spec form.
 *
 * Uses useFormStatus to detect when the form is being submitted so it can
 * show a loading state while Claude drafts the spec (typically 3–8 seconds).
 * This is a client component because useFormStatus only works in the browser.
 */
import { useFormStatus } from "react-dom";

export function SpecSubmitButton() {
  // pending is true while the server action is running
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          {/* Bootstrap spinner — appears inline with the label */}
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          Drafting with AI…
        </>
      ) : (
        "Create spec"
      )}
    </button>
  );
}
