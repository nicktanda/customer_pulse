"use client";

import { useState, useEffect, useTransition } from "react";
import { ACCENT_PALETTE, STORAGE_KEY, DEFAULT_ACCENT, type AccentId, getAccentById } from "./AccentColourProvider";

interface AccentColourPickerProps {
  /** Current persisted value from the server (undefined = not yet loaded) */
  initialAccentId?: string | null;
  /** Called after the user picks a colour; parent can persist to DB */
  onSave?: (accentId: AccentId) => Promise<void>;
}

export default function AccentColourPicker({ initialAccentId, onSave }: AccentColourPickerProps) {
  const [selected, setSelected] = useState<AccentId>(
    (initialAccentId as AccentId) ?? DEFAULT_ACCENT
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Sync with initialAccentId when it resolves from the server
  useEffect(() => {
    if (initialAccentId) {
      setSelected(initialAccentId as AccentId);
    }
  }, [initialAccentId]);

  function applyAccent(id: AccentId) {
    const accent = getAccentById(id);
    document.documentElement.setAttribute("data-accent", accent.id);
    document.documentElement.style.setProperty("--accent-colour", accent.hex);
    document.documentElement.style.setProperty("--accent-colour-rgb", accent.rgb);
    localStorage.setItem(STORAGE_KEY, id);
  }

  function handleSelect(id: AccentId) {
    setSelected(id);
    applyAccent(id);
    setSaved(false);

    if (onSave) {
      startTransition(async () => {
        await onSave(id);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div>
      <label className="form-label fw-semibold mb-2">
        Accent Colour
      </label>
      <p className="text-muted small mb-3">
        Choose an accent colour for buttons, links, and interactive elements.
      </p>
      <div className="d-flex flex-wrap gap-2 mb-2" role="group" aria-label="Accent colour palette">
        {ACCENT_PALETTE.map((colour) => {
          const isSelected = selected === colour.id;
          return (
            <button
              key={colour.id}
              type="button"
              title={colour.label}
              aria-label={`${colour.label}${isSelected ? " (selected)" : ""}`}
              aria-pressed={isSelected}
              onClick={() => handleSelect(colour.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: colour.hex,
                border: isSelected ? `3px solid ${colour.hex}` : "3px solid transparent",
                outline: isSelected ? `2px solid ${colour.hex}` : "2px solid transparent",
                outlineOffset: 2,
                cursor: "pointer",
                padding: 0,
                transition: "transform 0.1s, outline 0.1s",
                transform: isSelected ? "scale(1.15)" : "scale(1)",
                boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${colour.hex}` : "none",
              }}
            />
          );
        })}
      </div>
      {saved && (
        <p className="text-success small mt-1 mb-0">
          ✓ Accent colour saved
        </p>
      )}
      {isPending && (
        <p className="text-muted small mt-1 mb-0">
          Saving…
        </p>
      )}
    </div>
  );
}
