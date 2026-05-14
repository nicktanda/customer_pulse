"use client";

import React from "react";
import { useAccentColour, ACCENT_COLOURS, AccentColourId } from "../lib/useAccentColour";
import styles from "./AccentColourPicker.module.css";

export default function AccentColourPicker() {
  const { accent, setAccent } = useAccentColour();

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Accent Colour</h3>
      <p className={styles.description}>
        Choose a highlight colour applied to buttons, links, and interactive elements.
      </p>
      <div className={styles.palette} role="radiogroup" aria-label="Accent colour">
        {ACCENT_COLOURS.map((colour) => (
          <button
            key={colour.id}
            type="button"
            role="radio"
            aria-checked={accent === colour.id}
            aria-label={colour.label}
            title={colour.label}
            className={[
              styles.swatch,
              accent === colour.id ? styles.swatchActive : "",
            ].join(" ")}
            style={{ "--swatch-colour": colour.value } as React.CSSProperties}
            onClick={() => setAccent(colour.id as AccentColourId)}
          />
        ))}
      </div>
      <p className={styles.currentLabel}>
        Selected: <strong>{ACCENT_COLOURS.find((c) => c.id === accent)?.label}</strong>
      </p>
    </div>
  );
}
