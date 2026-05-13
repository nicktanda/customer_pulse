"use client";

import { useState, useEffect } from "react";
import {
  AccentColourPicker,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  ACCENT_COLOURS,
  type AccentColourLabel,
} from "./AccentColourPicker";

/**
 * Settings section wrapper for the AccentColourPicker.
 * Reads the current value from localStorage and renders the picker.
 */
export function AccentColourPickerSection() {
  const [current, setCurrent] = useState<AccentColourLabel>(DEFAULT_ACCENT);

  useEffect(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColourLabel | null;
    if (stored && ACCENT_COLOURS.some((c) => c.label === stored)) {
      setCurrent(stored);
    }
  }, []);

  return (
    <div className="card p-3">
      <AccentColourPicker
        value={current}
        onChange={(label) => setCurrent(label)}
      />
      <p className="text-muted mt-2" style={{ fontSize: "0.8rem" }}>
        Choose the highlight colour used throughout the app. Your preference is
        saved locally and applied on every visit.
      </p>
    </div>
  );
}
