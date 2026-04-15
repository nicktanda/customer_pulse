"use client";

/**
 * Client-only charts: Recharts expects browser APIs / DOM.
 * Parent passes plain JSON serializable points so the server page stays a Server Component.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rechartsBarTooltipProps, rechartsLineTooltipProps } from "@/components/reporting/rechartsTooltipTheme";

export type DailyVolumePoint = { day: string; count: number };

export function FeedbackVolumeLineChart({ data }: { data: DailyVolumePoint[] }) {
  if (data.length === 0) {
    return <p className="small text-body-secondary mb-0">No feedback in this range.</p>;
  }
  return (
    <div
      style={{ width: "100%", height: 280 }}
      role="img"
      aria-label="Line chart of feedback count per day in the selected range"
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          {/* Theme-aware tooltip; keeps the thin vertical crosshair for line charts */}
          <Tooltip {...rechartsLineTooltipProps} />
          <Line type="monotone" dataKey="count" name="Feedback" stroke="var(--bs-primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export type BreakdownRow = { key: string; count: number };

export function BreakdownBarChart({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const chartData = rows.map((r) => ({ name: r.key, count: r.count }));
  if (chartData.length === 0) {
    return (
      <div className="card border-secondary-subtle shadow-sm h-100">
        <div className="card-body">
          <h3 className="h6 text-body-emphasis">{title}</h3>
          <p className="small text-body-secondary mb-0">No data.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="card border-secondary-subtle shadow-sm h-100">
      <div className="card-body">
        <h3 className="h6 text-body-emphasis">{title}</h3>
        <div
          style={{ width: "100%", height: 260 }}
          className="mt-2"
          role="img"
          aria-label={`Bar chart: ${title}`}
        >
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              {/* No full-row hover band — only this styled tooltip (see rechartsTooltipTheme) */}
              <Tooltip {...rechartsBarTooltipProps} />
              <Legend />
              <Bar dataKey="count" name="Count" fill="var(--bs-primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
