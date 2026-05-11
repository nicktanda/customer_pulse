"use client";

import React, { useEffect, useState, useTransition } from "react";
import { AccentColorPicker } from "./AccentColorPicker";

const FEATURE_FLAG_KEY = "accent_color_enabled";
const STORAGE_KEY = "user_accent_color";
const DEFAULT_ACCENT = "#4F46E5";
const CSS_PROPERTY = "--color-accent";

/**
 * Reads a simple feature flag from localStorage (or env).
 * In a real rollout this would be fetched from the server / feature-flag service.
 */
function isAccentColorEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Check env override first (set NEXT_PUBLIC_ACCENT_COLOR_ENABLED=true to enable)
  if (process.env.NEXT_PUBLIC_ACCENT_COLOR_ENABLED === "true") return true;
  try {
    return localStorage.getItem(FEATURE_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Applies the accent colour to the document root as a CSS custom property.
 */
function applyAccentColor(color: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(CSS_PROPERTY, color);
}

/**
 * Persists the chosen colour. In production this would call an API route to
 * save the preference against the user's account; here we use localStorage as
 * a lightweight stand-in that can be swapped out easily.
 */
async function saveAccentColor(color: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, color);
  } catch {
    // Silently ignore storage errors
  }
  // TODO: replace with fetch('/api/user/preferences', { method: 'PATCH', body: JSON.stringify({ accentColor: color }) })
}

/**
 * Loads a previously saved accent colour from storage.
 */
function loadAccentColor(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function AccentColorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [color, setColor] = useState(DEFAULT_ACCENT);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const flagOn = isAccentColorEnabled();
    setEnabled(flagOn);
    if (flagOn) {
      const stored = loadAccentColor();
      setColor(stored);
      applyAccentColor(stored);
    }
  }, []);

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    applyAccentColor(newColor);
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveAccentColor(color);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  const handleReset = () => {
    handleColorChange(DEFAULT_ACCENT);
    startTransition(async () => {
      await saveAccentColor(DEFAULT_ACCENT);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  if (!enabled) {
    return null;
  }

  return (
    <section className="accent-color-settings" aria-labelledby="accent-color-settings-heading">
      <h3 id="accent-color-settings-heading" className="accent-color-settings__heading">
        Accent colour
      </h3>
      <p className="accent-color-settings__description">
        Choose a highlight colour used for buttons, active states, and focus rings
        throughout the app.
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
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save preference"}
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
