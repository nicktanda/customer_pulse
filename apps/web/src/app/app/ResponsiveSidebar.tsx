"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * On small viewports the nav lives in a fixed drawer so the main column can use full width.
 * On `lg` and up the sidebar stays visible (Bootstrap breakpoint 992px).
 *
 * The open trigger comes from MobileTopBar via a custom browser event ("app:sidebar-open"),
 * which avoids prop-drilling through the server-component layout.
 * Closing when the route changes avoids a stale open menu after navigation.
 */
export function ResponsiveSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the user navigates to a new route
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Listen for the open signal fired by MobileTopBar's hamburger button
  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("app:sidebar-open", handleOpen);
    return () => window.removeEventListener("app:sidebar-open", handleOpen);
  }, []);

  return (
    <>
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
        {children}
      </aside>
    </>
  );
}
