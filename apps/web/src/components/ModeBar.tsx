"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Mode = {
  label: string;
  /** Short question shown under the label to clarify intent. */
  sublabel: string;
  /** Where clicking the mode tab navigates to. */
  href: string;
  /** Returns true when this mode should be highlighted for the given pathname. */
  activeWhen: (pathname: string) => boolean;
};

const MODES: Mode[] = [
  {
    label: "Learn",
    sublabel: "What are customers saying?",
    href: "/app/learn/insights",
    activeWhen: (p) =>
      /*
       * Match both the new canonical paths (/app/learn/...) and any old paths
       * that haven't fully redirected yet (belt-and-suspenders for the
       * transition period — middleware handles the actual 301s).
       */
      p.startsWith("/app/learn") ||
      p.startsWith("/app/reporting") ||
      p.startsWith("/app/strategy") ||
      p.startsWith("/app/pulse-reports") ||
      p === "/app" ||
      p === "/app/",
  },
  {
    label: "Build",
    sublabel: "What should we build?",
    href: "/app/build",
    activeWhen: (p) => p.startsWith("/app/build"),
  },
  {
    label: "Monitor",
    sublabel: "Is it working?",
    href: "/app/monitor",
    activeWhen: (p) => p.startsWith("/app/monitor"),
  },
];

/**
 * Horizontal mode switcher that sits between the sidebar and the main content area.
 * Shows three product modes — Learn, Build, Monitor — and highlights the active one
 * based on the current URL.
 *
 * Background uses --bs-secondary-bg so it matches the sidebar and forms a consistent
 * "shell frame" around the lighter main content area (--bs-tertiary-bg).
 */
export function ModeBar() {
  const pathname = usePathname() ?? "";

  return (
    <div
      className="mode-bar-shell border-bottom border-secondary-subtle bg-body-secondary px-4 d-flex align-items-end"
      style={{ flexShrink: 0 }}
    >
      <nav className="d-flex" aria-label="Product mode">
        {MODES.map((mode) => {
          const active = mode.activeWhen(pathname);
          return (
            <Link
              key={mode.href}
              href={mode.href}
              className="mode-bar-tab text-decoration-none d-flex flex-column gap-1 px-3"
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : undefined}
              style={{
                paddingTop: "0.875rem",
                paddingBottom: "0.875rem",
                /*
                 * The -1px bottom margin makes the 2px active border overlap the
                 * container's 1px border-bottom so the active tab sits flush
                 * rather than double-bordering.
                 */
                marginBottom: "-1px",
                borderBottom: active
                  ? "2px solid var(--bs-primary)"
                  : "2px solid transparent",
                /*
                 * Active tab: ember colour for label + a very subtle ember tint
                 * behind the tab so it reads as "selected" even before the bottom
                 * border catches the eye.
                 */
                color: active ? "var(--bs-primary)" : "var(--bs-body-color)",
                background: active
                  ? "rgba(var(--bs-primary-rgb), 0.07)"
                  : "transparent",
                borderRadius: "0.375rem 0.375rem 0 0",
                transition: "color 0.15s ease, border-color 0.15s ease, background 0.15s ease",
              }}
            >
              {/* Mode label — semibold when active, medium weight when not */}
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: active ? 600 : 500,
                  letterSpacing: active ? "-0.01em" : undefined,
                }}
              >
                {mode.label}
              </span>
              {/* Sublabel — always muted, slightly larger so it reads as context not noise */}
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--bs-secondary-color)",
                  lineHeight: 1.3,
                }}
              >
                {mode.sublabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
