"use client";

import { useState, useEffect } from "react";
import { ACCENT_COLOURS, DEFAULT_ACCENT_KEY, type AccentColourKey } from "./accentColours";
import { applyAccent } from "./AccentColourProvider";

export function AccentColourPicker() {
  const [selected, setSelected] = useState<AccentColourKey>(DEFAULT_ACCENT_KEY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("accentColour");
    if (stored && Object.prototype.hasOwnProperty.call(ACCENT_COLOURS, stored)) {
      setSelected(stored as AccentColourKey);
    }
  }, []);

  function handleSelect(key: AccentColourKey) {
    setSelected(key);
    setSaved(false);
  }

  function handleSave() {
    applyAccent(selected);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
        {(Object.entries(ACCENT_COLOURS) as [AccentColourKey, typeof ACCENT_COLOURS[AccentColourKey]][]).map(
          ([key, colour]) => {
            const isSelected = selected === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={colour.label}
                title={colour.label}
                onClick={() => handleSelect(key)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: colour.value,
                  border: isSelected ? `3px solid #1a1a1a` : "3px solid transparent",
                  outline: isSelected ? `2px solid ${colour.value}` : "none",
                  outlineOffset: 2,
                  cursor: "pointer",
                  padding: 0,
                  transition: "outline 0.15s, border-color 0.15s",
                  boxShadow: isSelected ? `0 0 0 2px ${colour.value}` : "0 1px 3px rgba(0,0,0,0.15)",
                }}
              />
            );
          }
        )}
      </div>

      <div className="d-flex align-items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          {/* Inline style previews the selected colour before the user clicks Apply;
              after Apply, accent.css takes over via var(--accent-colour). */}
          style={{ background: ACCENT_COLOURS[selected].value, borderColor: ACCENT_COLOURS[selected].hover }}
        >
          Apply colour
        </button>
        {saved && (
          <span className="small text-success" role="status">
            ✓ Accent colour saved
          </span>
        )}
      </div>

      <p className="small text-body-secondary mb-0">
        Your preference is saved locally in this browser. The selected colour is applied to buttons and
        interactive highlights across the app.
      </p>
    </div>
  );
}
