"use client";

import { useState, useEffect } from "react";
import {
  AccentColourPicker,
  getStoredAccentColour,
  DEFAULT_ACCENT,
  type AccentColourLabel,
} from "./AccentColourPicker";

/**
 * Settings section wrapper for the AccentColourPicker.
 * Reads the current value from localStorage and renders the picker.
 */
export function AccentColourPickerSection() {
  const [current, setCurrent] = useState<AccentColourLabel>(DEFAULT_ACCENT);

  useEffect(() => {
    setCurrent(getStoredAccentColour());
  }, []);

  return (
    <div>
      <AccentColourPicker
        value={current}
        onChange={(label) => setCurrent(label)}
      />
    </div>
  );
}
