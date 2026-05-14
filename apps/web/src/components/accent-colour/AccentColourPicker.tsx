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
        {ACCENT_COLOURS.map((colour) => {
          const isSelected = accentId === colour.id;
          return (
            <button
              key={colour.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colour.label}
              title={colour.label}
              className={`${styles.swatch} ${isSelected ? styles.swatchSelected : ""}`}
              style={{
                backgroundColor: colour.value,
                // Show the dark variant as a half-split using a conic gradient
                background: `conic-gradient(${colour.value} 180deg, ${colour.dark} 180deg)`,
              }}
              onClick={() => setAccentId(colour.id as AccentColourId)}
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
