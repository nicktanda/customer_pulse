"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * When `?notice=pulse` is present, polls `router.refresh()` every few seconds
 * so the newly-created report appears without a manual page reload.
 * Shows a spinner while waiting. Removes the `notice` param once the report
 * count increases or on timeout.
 */
export function PulseJobPoller({ initialReportCount }: { initialReportCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  const countRef = useRef(0);
  const initialCountRef = useRef(initialReportCount);
  const [polling, setPolling] = useState(notice === "pulse");

  const clearNotice = useCallback(() => {
    setPolling(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("notice");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (notice !== "pulse") return;

    // Report appeared — the server re-rendered with a higher count
    if (initialReportCount > initialCountRef.current) {
      clearNotice();
      return;
    }

    setPolling(true);
    countRef.current = 0;
    const interval = setInterval(() => {
      countRef.current += 1;
      router.refresh();
      if (countRef.current >= 36) {
        clearInterval(interval);
        clearNotice();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [notice, router, initialReportCount, clearNotice]);

  if (!polling) return null;

  return (
    <div
      className="alert alert-info d-flex align-items-center gap-2 mt-3"
      role="status"
    >
      <div
        className="spinner-border spinner-border-sm text-info"
        role="status"
        aria-hidden="true"
      />
      <span>Synthesizing pulse digest&hellip;</span>
    </div>
  );
}
