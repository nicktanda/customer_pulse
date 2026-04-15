import type { CSSProperties } from "react";
import type { TooltipProps } from "recharts";

/**
 * Recharts' built-in tooltip defaults to a white panel. On dark pages (`data-bs-theme="dark"`),
 * the category label often inherits a light grey color, so it disappears on white — and the
 * default hover "cursor" on bar charts is a huge rectangle across the plot. These props fix both.
 */

export const rechartsTooltipContentStyle: CSSProperties = {
  margin: 0,
  padding: "8px 12px",
  // Match the app surface so light and dark themes both look intentional.
  backgroundColor: "var(--bs-body-bg)",
  color: "var(--bs-body-color)",
  border: "1px solid var(--bs-border-color)",
  borderRadius: "0.375rem",
  boxShadow: "0 0.25rem 0.75rem rgba(0, 0, 0, 0.2)",
};

export const rechartsTooltipLabelStyle: CSSProperties = {
  color: "var(--bs-body-color)",
  fontWeight: 600,
  marginBottom: 4,
};

export const rechartsTooltipItemStyle: CSSProperties = {
  color: "var(--bs-body-color)",
  paddingTop: 2,
  paddingBottom: 2,
};

/** Line charts: keep the default crosshair cursor; only restyle the HTML tooltip. */
export const rechartsLineTooltipProps = {
  contentStyle: rechartsTooltipContentStyle,
  labelStyle: rechartsTooltipLabelStyle,
  itemStyle: rechartsTooltipItemStyle,
  // Slightly more breathing room between pointer and box than Recharts' default (10).
  offset: 14,
} satisfies TooltipProps;

/**
 * Bar charts: Recharts draws a band cursor that spans the whole category row (very noisy on
 * horizontal bars). Turning the cursor off leaves a clean bar + readable tooltip only.
 */
export const rechartsBarTooltipProps = {
  ...rechartsLineTooltipProps,
  cursor: false,
} satisfies TooltipProps;
