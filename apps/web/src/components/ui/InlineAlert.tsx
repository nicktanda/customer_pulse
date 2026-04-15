import type { ReactNode } from "react";

export type InlineAlertVariant = "danger" | "success" | "warning" | "info" | "light";

type InlineAlertProps = {
  variant: InlineAlertVariant;
  children: ReactNode;
  /** Extra spacing or layout, e.g. `mt-3` below a toolbar, `mb-3` before a button row */
  className?: string;
  /** Override automatic role (success/light default to status; others to alert). */
  role?: "alert" | "status";
};

const VARIANT_CLASS: Record<InlineAlertVariant, string> = {
  danger: "alert-danger",
  success: "alert-success",
  warning: "alert-warning",
  info: "alert-info",
  /** Empty-state style on the dashboard (not a semantic “info” tone). */
  light: "alert-light border border-secondary-subtle shadow-sm",
};

function defaultRole(variant: InlineAlertVariant): "alert" | "status" {
  if (variant === "success" || variant === "light") return "status";
  return "alert";
}

/**
 * Compact flash / inline validation message — same Bootstrap alert look app-wide.
 */
export function InlineAlert({ variant, children, className = "", role }: InlineAlertProps) {
  return (
    <div
      className={`alert ${VARIANT_CLASS[variant]} small py-2 mb-0 ${className}`.trim()}
      role={role ?? defaultRole(variant)}
    >
      {children}
    </div>
  );
}
