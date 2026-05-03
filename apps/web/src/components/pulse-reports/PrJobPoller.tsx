"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Auto-refreshes the page while PR generation jobs are pending.
 * Stops once `hasPendingPrs` becomes false (server re-render) or after ~2 min.
 */
export function PrJobPoller({ hasPendingPrs }: { hasPendingPrs: boolean }) {
  const router = useRouter();
  const countRef = useRef(0);

  useEffect(() => {
    if (!hasPendingPrs) return;

    countRef.current = 0;
    const interval = setInterval(() => {
      countRef.current += 1;
      router.refresh();
      if (countRef.current >= 24) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasPendingPrs, router]);

  if (!hasPendingPrs) return null;

  return (
    <div
      className="d-flex align-items-center gap-2 mt-3 small text-body-secondary"
      role="status"
    >
      <div
        className="spinner-border spinner-border-sm"
        role="status"
        aria-hidden="true"
      />
      <span>Splicing new pattern&hellip; PR forming.</span>
    </div>
  );
}
