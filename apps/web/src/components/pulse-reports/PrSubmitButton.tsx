"use client";

import { useFormStatus } from "react-dom";

export function PrSubmitButton({ label, className, style }: { label: string; className?: string; style?: React.CSSProperties }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? "btn btn-link btn-sm p-0"}
      style={style}
    >
      {pending ? (
        <span className="d-flex align-items-center gap-1">
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
            style={{ width: "0.75rem", height: "0.75rem" }}
          />
          Queuing&hellip;
        </span>
      ) : (
        label
      )}
    </button>
  );
}
