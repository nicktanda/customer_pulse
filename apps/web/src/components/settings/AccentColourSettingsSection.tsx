"use client";

/**
 * Embeddable drop-in for any existing settings page that wants to surface
 * the accent colour picker inline, without a full page navigation.
 */

import React, { useState } from "react";
import { AccentColourPicker } from "@/components/accent-colour/AccentColourPicker";

export function AccentColourSettingsSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-4">
      <div
        className="d-flex align-items-center justify-content-between"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
      >
        <div>
          <h6 className="mb-0 fw-semibold">Appearance</h6>
          <p className="text-muted small mb-0">Accent colour &amp; theme</p>
        </div>
        <span
          className="text-muted"
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </div>

      {open && (
        <div className="mt-3 ps-1">
          <AccentColourPicker />
        </div>
      )}
    </section>
  );
}
