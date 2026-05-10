"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import { AccentColorPicker } from "../../../components/AccentColorPicker";
import "../../../components/AccentColorPicker.css";
import { DEFAULT_ACCENT_COLOR, isValidHexColor } from "../../../lib/accentColor";
import { useAccentColor } from "../../../hooks/useAccentColor";
import "./AccentColorSettingsPanel.css";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Client component that:
 * 1. Fetches the user's stored accent colour from the API.
 * 2. Renders the AccentColorPicker.
 * 3. Saves the preference back to the API on change (debounced).
 */
export function AccentColorSettingsPanel() {
  const [serverColor, setServerColor] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [, startTransition] = useTransition();

  const { accentColor, passesContrast, setAccentColor, resetAccentColor } =
    useAccentColor(serverColor);

  // ------------------------------------------------------------------
  // Fetch user preference on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchPreference() {
      try {
        const res = await fetch("/api/profile/accent-color");
        if (!res.ok) return;
        const data = (await res.json()) as { accentColor?: string };
        if (!cancelled && data.accentColor && isValidHexColor(data.accentColor)) {
          setServerColor(data.accentColor);
        }
      } catch {
        // non-fatal – localStorage fallback is already applied
      }
    }

    fetchPreference();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Persist preference when colour changes
  // ------------------------------------------------------------------
  const handleChange = useCallback(
    (hex: string) => {
      setAccentColor(hex);

      startTransition(async () => {
        setSaveStatus("saving");
        try {
          const res = await fetch("/api/profile/accent-color", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accentColor: hex }),
          });
          setSaveStatus(res.ok ? "saved" : "error");
        } catch {
          setSaveStatus("error");
        } finally {
          setTimeout(() => setSaveStatus("idle"), 2500);
        }
      });
    },
    [setAccentColor]
  );

  const handleReset = useCallback(() => {
    resetAccentColor();
    handleChange(DEFAULT_ACCENT_COLOR);
  }, [handleChange, resetAccentColor]);

  return (
    <div className="accent-settings-panel">
      {/* Live preview strip */}
      <section className="accent-settings-panel__preview">
        <h2 className="accent-settings-panel__preview-title">Preview</h2>
        <div className="accent-settings-panel__preview-bar">
          <button className="accent-settings-panel__preview-btn-primary">Primary button</button>
          <button className="accent-settings-panel__preview-btn-outline">Outline button</button>
          <span className="accent-settings-panel__preview-badge">Badge</span>
          <span className="accent-settings-panel__preview-link">Link text</span>
        </div>
      </section>

      {/* Picker */}
      <section className="accent-settings-panel__picker-section">
        <AccentColorPicker
          value={accentColor}
          onChange={handleChange}
          allowCustom
        />
      </section>

      {/* Contrast feedback */}
      {passesContrast && (
        <p className="accent-settings-panel__contrast-ok">
          ✓ Contrast meets WCAG AA
        </p>
      )}

      {/* Save status */}
      <div className="accent-settings-panel__save-status" aria-live="polite">
        {saveStatus === "saving" && <span>Saving…</span>}
        {saveStatus === "saved" && <span className="accent-settings-panel__saved">✓ Saved</span>}
        {saveStatus === "error" && (
          <span className="accent-settings-panel__error">
            Failed to save. Your preference is stored locally.
          </span>
        )}
      </div>

      {/* Reset */}
      <div className="accent-settings-panel__reset-row">
        <button
          type="button"
          className="accent-settings-panel__reset-btn"
          onClick={handleReset}
        >
          Reset to default colour
        </button>
      </div>
    </div>
  );
}
