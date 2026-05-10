"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * When `?notice=pulse` is present, polls `router.refresh()` every few seconds
 * so the newly-created report appears without a manual page reload.
 * Shows a spinner while waiting. Removes the `notice` param once the report
 * count increases or on timeout.
 *
 * `baselineCount` is the row count snapshotted by the server action *before*
 * enqueuing — using it as the comparison anchor avoids a race where a fast
 * job inserts a row before the redirect's GET re-reads the count, which
 * would otherwise leave the spinner stuck for the full timeout.
 */
export function PulseJobPoller({
  initialReportCount,
  baselineCount,
}: {
  initialReportCount: number;
  baselineCount: number | null;
}) {
  // Keep the placeholder + spinner visible for at least this long so a
  // millisecond-fast job still gives the user perceptible feedback that
  // their click did something.
  const MIN_DISPLAY_MS = 1500;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  const countRef = useRef(0);
  const initialCountRef = useRef(initialReportCount);
  const mountTimeRef = useRef(Date.now());
  const baseline = baselineCount ?? initialCountRef.current;
  const [polling, setPolling] = useState(notice === "pulse");

  const clearNoticeNow = useCallback(() => {
    setPolling(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("notice");
    params.delete("before");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (notice !== "pulse") return;

    // Report appeared — the server re-rendered with a higher count
    if (initialReportCount > baseline) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      const t = setTimeout(clearNoticeNow, remaining);
      return () => clearTimeout(t);
    }

    setPolling(true);
    countRef.current = 0;
    const interval = setInterval(() => {
      countRef.current += 1;
      router.refresh();
      if (countRef.current >= 36) {
        clearInterval(interval);
        clearNoticeNow();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [notice, router, initialReportCount, baseline, clearNoticeNow]);

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
