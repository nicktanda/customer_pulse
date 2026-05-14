"use client";

import React from "react";
import {
  ACCENT_COLOURS,
  AccentColourId,
  useAccentColour,
} from "./AccentColourProvider";
import styles from "./AccentColourPicker.module.css";

export function AccentColourPicker() {
  const { accentId, setAccentId } = useAccentColour();

  return (
    <div>
      <label className="form-label fw-semibold mb-2 d-block">
        Accent colour
      </label>
      <p className="text-muted small mb-3">
        Applies to buttons, links, and interactive highlights across the app.
      </p>
      <div className={styles.swatchGrid} role="radiogroup" aria-label="Accent colour">
        {ACCENT_COLOURS.map((colour, index) => {
          const isSelected = accentId === colour.id;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              tabIndex={isSelected ? 0 : -1}
              className={`${styles.swatch} ${isSelected ? styles.swatchSelected : ""}`}
              style={{
                background: `conic-gradient(${colour.value} 180deg, ${colour.dark} 180deg)`,
              }}
              onClick={() => setAccentId(colour.id as AccentColourId)}
              onKeyDown={(e) => {
                const swatches = ACCENT_COLOURS;
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = swatches[(index + 1) % swatches.length]!;
                  setAccentId(next.id as AccentColourId);
                  // Focus will follow via tabIndex update on re-render — trigger manually
                  const parent = e.currentTarget.closest('[role="radiogroup"]');
                  if (parent) {
                    const nextBtn = parent.querySelectorAll('[role="radio"]')[
                      (index + 1) % swatches.length
                    ] as HTMLElement | undefined;
                    nextBtn?.focus();
                  }
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = swatches[(index - 1 + swatches.length) % swatches.length]!;
                  setAccentId(prev.id as AccentColourId);
                  const parent = e.currentTarget.closest('[role="radiogroup"]');
                  if (parent) {
                    const prevBtn = parent.querySelectorAll('[role="radio"]')[
                      (index - 1 + swatches.length) % swatches.length
                    ] as HTMLElement | undefined;
                    prevBtn?.focus();
                  }
                }
              }}
            >
              {isSelected && (
                <span className={styles.checkmark} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-muted" style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>
        Left half = light mode · Right half = dark mode
      </p>
    </div>
  );
}
