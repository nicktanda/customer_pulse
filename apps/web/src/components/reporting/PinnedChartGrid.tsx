/**
 * Server component — renders the pinned charts grid on the Reporting page.
 * Each chart is snapshotted at pin time so it shows the data as it was when pinned.
 * An "Unpin" button is wired to the DELETE /api/app/reporting/pin/:id route via a
 * small client-side wrapper below.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NlResultCharts } from "./NlResultCharts";
import { parseReportStructured } from "@/lib/reporting-structured";

type PinnedChart = {
  id: number;
  title: string;
  prompt: string;
  chartJson: Record<string, unknown>;
  narrative: string | null;
  rangeDays: number;
  pinnedAt: string; // ISO string
};

/**
 * Shows a "Pinned on …" subtitle and an Unpin button for a single pinned chart.
 */
function PinnedChartCard({ chart }: { chart: PinnedChart }) {
  const router = useRouter();
  const [unpinning, setUnpinning] = useState(false);

  const unpin = async () => {
    setUnpinning(true);
    try {
      await fetch(`/api/app/reporting/pin/${chart.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setUnpinning(false);
    }
  };

  // Wrap the chart JSON back into the reportStructured shape the renderer expects.
  const structured = parseReportStructured({
    narrative: chart.narrative ?? "",
    charts: [chart.chartJson],
  });

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h3 className="h6 text-body-emphasis mb-0">{chart.title}</h3>
          <p className="small text-body-tertiary mb-0" style={{ fontSize: "0.75rem" }}>
            Pinned on {new Date(chart.pinnedAt).toLocaleDateString()} · last {chart.rangeDays}d window
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => void unpin()}
          disabled={unpinning}
        >
          {unpinning ? "Unpinning…" : "Unpin"}
        </button>
      </div>
      {chart.narrative ? (
        <p className="small text-body-secondary mb-0">{chart.narrative}</p>
      ) : null}
      {structured ? (
        <NlResultCharts structured={structured} />
      ) : (
        <p className="small text-body-secondary">Chart data could not be rendered.</p>
      )}
    </div>
  );
}

/**
 * Renders all pinned charts for the project.
 * Shows an empty state when no charts are pinned yet.
 */
export function PinnedChartGrid({ charts }: { charts: PinnedChart[] }) {
  if (charts.length === 0) {
    return (
      <div className="card border-secondary-subtle shadow-sm">
        <div className="card-body text-center py-4 text-body-secondary small">
          No pinned charts yet — generate a graph below and click <strong>Pin to page</strong> to keep it here.
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      {charts.map((chart) => (
        <div key={chart.id} className="card border-secondary-subtle shadow-sm">
          <div className="card-body">
            <PinnedChartCard chart={chart} />
          </div>
        </div>
      ))}
    </div>
  );
}
