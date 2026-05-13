"use client";

import React, { useRef, KeyboardEvent } from "react";
import "../accent-colour-picker.css";
import {
  ACCENT_PALETTE,
  AccentColour,
  useAccentColour,
} from "./AccentColourProvider";

export default function AccentColourPicker() {
  const { accent, setAccent } = useAccentColour();
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (index + 1) % ACCENT_PALETTE.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (index - 1 + ACCENT_PALETTE.length) % ACCENT_PALETTE.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = ACCENT_PALETTE.length - 1;
    }
    if (next !== null) {
      e.preventDefault();
      swatchRefs.current[next]?.focus();
      setAccent(ACCENT_PALETTE[next].id);
    }
  }

  return (
    <div className="accent-colour-picker">
      <p className="accent-colour-picker__label">Accent colour</p>
      <div
        className="accent-colour-picker__swatches"
        role="radiogroup"
        aria-label="Accent colour"
      >
        {ACCENT_PALETTE.map((entry, index) => {
          const isSelected = accent === entry.id;
          return (
            <button
              key={entry.id}
              ref={(el) => { swatchRefs.current[index] = el; }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={entry.label}
              title={`${entry.label} — ${entry.a11y}`}
              tabIndex={isSelected ? 0 : -1}
              className={[
                "accent-colour-picker__swatch",
                isSelected ? "accent-colour-picker__swatch--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--swatch-colour": entry.swatch } as React.CSSProperties}
              onClick={() => setAccent(entry.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
          );
        })}
      </div>
      <p className="accent-colour-picker__hint">
        Changes are saved automatically.
      </p>
    </div>
  );
}
