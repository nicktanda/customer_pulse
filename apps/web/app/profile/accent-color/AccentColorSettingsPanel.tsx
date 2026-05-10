"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  // Ref to track the status-reset timer so we can clear it on rapid changes
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { accentColor, passesContrast, setAccentColor } =
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
  const saveToServer = useCallback(async (hex: string) => {
    // Clear any pending status-reset timer before starting a new save
    if (statusTimerRef.current !== null) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }

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
      statusTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
        statusTimerRef.current = null;
      }, 2500);
    }
  }, []);

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (hex: string) => {
      setAccentColor(hex);
      saveToServer(hex);
    },
    [setAccentColor, saveToServer]
  );

  const handleReset = useCallback(() => {
    // Use handleChange as the single path so local state + server stay in sync.
    // resetAccentColor from the hook would duplicate the localStorage write.
    handleChange(DEFAULT_ACCENT_COLOR);
  }, [handleChange]);

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
