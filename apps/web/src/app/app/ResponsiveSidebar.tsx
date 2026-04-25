"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * On small viewports the nav lives in a fixed drawer so the main column can use full width.
 * On `lg` and up the sidebar stays visible (Bootstrap breakpoint 992px).
 * Closing when the route changes avoids a stale open menu after navigation.
 */
export function ResponsiveSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Hamburger toggle — only visible below lg breakpoint */}
      <button
        type="button"
        className="d-lg-none position-fixed top-0 start-0 border-0 d-flex align-items-center justify-content-center"
        style={{
          zIndex: 1060,
          margin: "0.6rem",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "0.4rem",
          background: "var(--bs-secondary-bg)",
          color: "var(--bs-body-color)",
          cursor: "pointer",
        }}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="app-sidebar-nav"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} aria-hidden="true" />
      </button>
      {open ? (
        <button
          type="button"
          className="app-sidebar-backdrop d-lg-none position-fixed top-0 start-0 w-100 h-100 border-0 p-0"
          style={{ zIndex: 1040, background: "rgba(0,0,0,0.35)" }}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        id="app-sidebar-nav"
        className={`app-sidebar border-end bg-body-secondary flex-shrink-0 p-3 d-flex flex-column${open ? " app-sidebar--open" : ""}`}
        style={{ width: "14rem" }}
      >
        <div className="d-flex d-lg-none justify-content-between align-items-center pb-2 mb-2 border-bottom border-secondary-subtle">
          <span className="small fw-semibold text-body-secondary">Navigation</span>
          {/* X icon closes the drawer */}
          <button
            type="button"
            className="border-0 d-flex align-items-center justify-content-center"
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "0.35rem",
              background: "transparent",
              color: "var(--bs-secondary-color)",
              cursor: "pointer",
            }}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
