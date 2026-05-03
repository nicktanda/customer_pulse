"use client";

import { Menu } from "lucide-react";

/**
 * Slim top bar shown only on mobile (d-lg-none).
 * On desktop the sidebar is always visible, so this bar is hidden.
 *
 * The hamburger fires a custom browser event that ResponsiveSidebar listens for,
 * avoiding any prop-drilling or context through the server-component layout.
 */
export function MobileTopBar() {
  function openSidebar() {
    window.dispatchEvent(new CustomEvent("app:sidebar-open"));
  }

  return (
    <div
      className="d-lg-none d-flex align-items-center gap-3 px-3 border-bottom border-secondary-subtle bg-body-secondary"
      style={{ height: "3.25rem", flexShrink: 0 }}
    >
      {/* Hamburger button — triggers the sidebar drawer */}
      <button
        type="button"
        className="border-0 d-flex align-items-center justify-content-center"
        style={{
          width: "2rem",
          height: "2rem",
          borderRadius: "0.375rem",
          background: "transparent",
          color: "var(--bs-body-color)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="Open navigation menu"
        onClick={openSidebar}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* App wordmark — mirrors the sidebar logo so the brand is always visible */}
      <div className="d-flex align-items-center gap-2">
        <span aria-hidden="true" className="xf-brand-mark" style={{ width: "1.05rem", height: "1.05rem" }} />
        <span
          className="fw-semibold text-uppercase"
          style={{ color: "var(--xf-accent)", letterSpacing: "0.08em", fontSize: "0.7rem" }}
        >
          xenoform.ai
        </span>
      </div>
    </div>
  );
}
