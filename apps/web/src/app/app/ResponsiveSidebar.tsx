"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm d-lg-none position-fixed top-0 start-0 m-2"
        style={{ zIndex: 1060 }}
        aria-expanded={open}
        aria-controls="app-sidebar-nav"
        onClick={() => setOpen(true)}
      >
        Menu
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
          <button type="button" className="btn-close" aria-label="Close menu" onClick={() => setOpen(false)} />
        </div>
        {children}
      </aside>
    </>
  );
}
