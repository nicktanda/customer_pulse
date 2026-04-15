"use client";

/**
 * Header checkbox: selects every feedback row checkbox on the current page.
 * The list page stays a server component; only this tiny control needs the browser.
 */
export function FeedbackSelectAll({ ariaLabel }: { ariaLabel?: string }) {
  return (
    <input
      type="checkbox"
      className="form-check-input"
      aria-label={ariaLabel ?? "Select all feedback on this page"}
      title={ariaLabel ?? "Select all on this page"}
      onChange={(e) => {
        const checked = e.target.checked;
        const root = e.target.closest("form");
        if (!root) {
          return;
        }
        // Setting `.checked` in code does not fire `change` on each row; bubble a synthetic `change`
        // so listeners (e.g. bulk toolbar visibility) stay in sync with “select all”.
        root.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="feedback_ids"]').forEach((el) => {
          el.checked = checked;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }}
    />
  );
}
