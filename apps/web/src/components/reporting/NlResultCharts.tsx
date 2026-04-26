"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  rechartsBarTooltipProps,
  rechartsLineTooltipProps,
  rechartsTooltipContentStyle,
  rechartsTooltipItemStyle,
  rechartsTooltipLabelStyle,
} from "@/components/reporting/rechartsTooltipTheme";
import type { ReportStructured } from "@/lib/reporting-structured";

/**
 * A small ember-inspired palette for pie slices and multi-series charts.
 * Falls back gracefully when there are more series than colours.
 */
const SERIES_COLORS = [
  "var(--bs-primary)",
  "var(--bs-success)",
  "var(--bs-warning)",
  "var(--bs-danger)",
  "var(--bs-info)",
  "#6f42c1", // purple
  "#fd7e14", // orange
  "#20c997", // teal
];

function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? "var(--bs-primary)";
}

type ChartSpec = ReportStructured["charts"][number];

/**
 * Converts chart spec labels + series into the flat row format Recharts expects.
 * Each row is { label: string, [seriesName]: number, … }.
 */
function toRows(chart: ChartSpec): Record<string, string | number>[] {
  return chart.labels.map((label, idx) => {
    const row: Record<string, string | number> = { label };
    for (const s of chart.series) {
      row[s.name] = s.data[idx] ?? 0;
    }
    return row;
  });
}

function ChartCard({ chart, chartIndex, onPin }: { chart: ChartSpec; chartIndex: number; onPin?: (i: number) => void }) {
  const rows = toRows(chart);
  const seriesKeys = chart.series.map((s) => s.name);

  return (
    <div className="card border-secondary-subtle shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          {chart.title ? <h4 className="h6 text-body-emphasis mb-0">{chart.title}</h4> : <span />}
          {onPin ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => onPin(chartIndex)}
              title="Pin this chart to the Reporting page"
            >
              Pin to page
            </button>
          ) : null}
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            {renderChart(chart, rows, seriesKeys)}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns the right Recharts element for each chart type.
 * scatter is included here as a v2 placeholder — the system prompt already generates
 * correct scatter JSON but the context bundle doesn't yet expose two numeric dimensions,
 * so it renders as a basic scatter plot with aggregated counts.
 */
function renderChart(
  chart: ChartSpec,
  rows: Record<string, string | number>[],
  seriesKeys: string[],
): React.ReactElement {
  switch (chart.type) {
    case "line":
      return (
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip {...rechartsLineTooltipProps} />
          <Legend />
          {seriesKeys.map((name, j) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={seriesColor(j)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      );

    case "area":
      return (
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip {...rechartsLineTooltipProps} />
          <Legend />
          {seriesKeys.map((name, j) => (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              stroke={seriesColor(j)}
              fill={seriesColor(j)}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );

    case "bar_stacked":
      return (
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip {...rechartsBarTooltipProps} />
          <Legend />
          {seriesKeys.map((name, j) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="a"
              fill={seriesColor(j)}
              radius={j === seriesKeys.length - 1 ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      );

    case "bar_horizontal":
      return (
        // layout="vertical" makes the bars run left-to-right; XAxis becomes numeric, YAxis becomes categorical.
        <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={120} />
          <Tooltip {...rechartsBarTooltipProps} />
          <Legend />
          {seriesKeys.map((name, j) => (
            <Bar key={name} dataKey={name} fill={seriesColor(j)} radius={[0, 4, 4, 0]} />
          ))}
        </BarChart>
      );

    case "pie": {
      // For pie charts the model produces a single series; labels = slice names.
      const sliceData = chart.labels.map((label, idx) => ({
        name: label,
        value: chart.series[0]?.data[idx] ?? 0,
      }));
      return (
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={sliceData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
            labelLine={false}
          >
            {sliceData.map((_, idx) => (
              <Cell key={idx} fill={seriesColor(idx)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={rechartsTooltipContentStyle}
            labelStyle={rechartsTooltipLabelStyle}
            itemStyle={rechartsTooltipItemStyle}
          />
          <Legend />
        </PieChart>
      );
    }

    case "scatter": {
      // scatter: series[0] = x values, series[1] = y values, labels = point names.
      const scatterData = chart.labels.map((name, idx) => ({
        name,
        x: chart.series[0]?.data[idx] ?? 0,
        y: chart.series[1]?.data[idx] ?? 0,
      }));
      return (
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="x"
            name={chart.series[0]?.name ?? "X"}
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            dataKey="y"
            name={chart.series[1]?.name ?? "Y"}
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={rechartsTooltipContentStyle}
            labelStyle={rechartsTooltipLabelStyle}
            itemStyle={rechartsTooltipItemStyle}
          />
          <Scatter data={scatterData} fill={seriesColor(0)} />
        </ScatterChart>
      );
    }

    // Default fallback: plain grouped bar chart.
    default:
      return (
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip {...rechartsBarTooltipProps} />
          <Legend />
          {seriesKeys.map((name, j) => (
            <Bar key={name} dataKey={name} fill={seriesColor(j)} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
  }
}

/**
 * Renders one card per chart spec.
 * Pass an `onPin` callback to show a "Pin to page" button on each card.
 */
export function NlResultCharts({
  structured,
  onPin,
}: {
  structured: ReportStructured;
  onPin?: (chartIndex: number) => void;
}) {
  return (
    <div className="d-flex flex-column gap-4">
      {structured.charts.map((chart, i) => (
        <ChartCard key={i} chart={chart} chartIndex={i} onPin={onPin} />
      ))}
    </div>
  );
}
