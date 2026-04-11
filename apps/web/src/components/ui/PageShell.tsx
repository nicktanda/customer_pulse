import type { ReactNode } from "react";

/** Max-width presets so list pages vs narrow forms feel consistent across the app. */
const WIDTH_TO_CLASS: Record<"narrow" | "medium" | "wide" | "full", string> = {
  narrow: "app-page-shell--narrow",
  medium: "app-page-shell--medium",
  wide: "app-page-shell--wide",
  full: "",
};

type PageShellProps = {
  width: keyof typeof WIDTH_TO_CLASS;
  children: ReactNode;
  className?: string;
};

/**
 * Wraps page content with a predictable horizontal measure (centered when not `full`).
 * Use `narrow` for simple forms, `medium` for onboarding/settings, `wide` for tables.
 */
export function PageShell({ width, children, className = "" }: PageShellProps) {
  const widthClass = WIDTH_TO_CLASS[width];
  return (
    <div className={`app-page-shell ${widthClass} ${className}`.trim()}>{children}</div>
  );
}
