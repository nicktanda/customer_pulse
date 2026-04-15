"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rechartsBarTooltipProps, rechartsLineTooltipProps } from "@/components/reporting/rechartsTooltipTheme";
import type { ReportStructured } from "@/lib/reporting-structured";

/** Renders charts from a validated NL "report / chart" response (one card per chart spec). */
export function NlResultCharts({ structured }: { structured: ReportStructured }) {
  return (
    <div className="d-flex flex-column gap-4">
      {structured.charts.map((chart, i) => {
        const rows = chart.labels.map((label, idx) => {
          const row: Record<string, string | number> = { label };
          for (const s of chart.series) {
            row[s.name] = s.data[idx] ?? 0;
          }
          return row;
        });
        const seriesKeys = chart.series.map((s) => s.name);
        return (
          <div key={i} className="card border-secondary-subtle shadow-sm">
            <div className="card-body">
              {chart.title ? <h4 className="h6 text-body-emphasis">{chart.title}</h4> : null}
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  {chart.type === "line" ? (
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
                          stroke={j === 0 ? "var(--bs-primary)" : "var(--bs-success)"}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  ) : (
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
                          fill={j === 0 ? "var(--bs-primary)" : "var(--bs-info)"}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
