"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { AccentColorPicker } from "./AccentColorPicker";
import {
  ACCENT_STORAGE_KEY,
  ACCENT_FEATURE_FLAG_KEY,
  ACCENT_CSS_PROPERTY,
  DEFAULT_ACCENT,
} from "../lib/accentColorConstants";

/**
 * Reads a simple feature flag from localStorage (or env).
 * In a real rollout this would be fetched from the server / feature-flag service.
 */
function isAccentColorEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_ACCENT_COLOR_ENABLED === "true") return true;
  try {
    return localStorage.getItem(ACCENT_FEATURE_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Applies the accent colour to the document root as a CSS custom property.
 */
function applyAccentColor(color: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(ACCENT_CSS_PROPERTY, color);
}

/**
 * Persists the chosen colour.
 * TODO: replace localStorage with fetch('/api/user/preferences', { method: 'PATCH', … })
 *
 * NOTE: Passing an async callback to startTransition is not yet officially
 * supported in React 18 (it is in React 19). isPending may return to false
 * before the promise resolves. Consider upgrading to React 19 or using a
 * manual loading state instead.
 */
async function saveAccentColor(color: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
  } catch {
    // Silently ignore storage errors
  }
}

/**
 * Loads a previously saved accent colour from storage.
 */
function loadAccentColor(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY) ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function AccentColorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState(DEFAULT_ACCENT);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flagOn = isAccentColorEnabled();
    setEnabled(flagOn);
    if (flagOn) {
      const stored = loadAccentColor();
      setColor(stored);
      applyAccentColor(stored);
    }
  }, []);

  // Clear any pending "Saved" timer on unmount to avoid state updates after unmount.
  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const scheduleSavedReset = () => {
    if (savedTimerRef.current !== null) {
      clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    applyAccentColor(newColor);
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveAccentColor(color);
      setSaved(true);
      scheduleSavedReset();
    });
  };

  const handleReset = () => {
    handleColorChange(DEFAULT_ACCENT);
    startTransition(async () => {
      await saveAccentColor(DEFAULT_ACCENT);
      setSaved(true);
      scheduleSavedReset();
    });
  };

  if (!enabled) {
    return null;
  }

  return (
    <section
      className="accent-color-settings"
      aria-labelledby="accent-color-settings-heading"
    >
      <h3
        id="accent-color-settings-heading"
        className="accent-color-settings__heading"
      >
        Accent colour
      </h3>
      <p className="accent-color-settings__description">
        Choose a highlight colour used for buttons, active states, and focus
        rings throughout the app.
      </p>

      <div className="accent-color-settings__preview">
        <span className="accent-color-settings__preview-label">Preview:</span>
        <span
          className="accent-color-settings__preview-swatch"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <button
          type="button"
          className="accent-color-settings__preview-button"
          style={{
            backgroundColor: color,
            borderColor: color,
          }}
        >
          Sample button
        </button>
      </div>

      <AccentColorPicker
        currentColor={color}
        onColorChange={handleColorChange}
        disabled={isPending}
      />

      <div className="accent-color-settings__actions">
        <button
          type="button"
          className="accent-color-settings__save-btn"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Saving\u2026" : saved ? "Saved \u2713" : "Save preference"}
        </button>
        <button
          type="button"
          className="accent-color-settings__reset-btn"
          onClick={handleReset}
          disabled={isPending}
        >
          Reset to default
        </button>
      </div>
    </section>
  );
}
