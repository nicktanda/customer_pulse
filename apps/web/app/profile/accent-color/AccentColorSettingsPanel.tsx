"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccentColorPicker } from "../../../components/AccentColorPicker";
// AccentColorPicker.css is imported inside AccentColorPicker.tsx itself
import { DEFAULT_ACCENT_COLOR, isValidHexColor } from "../../../lib/accentColor";
import { useAccentColor } from "../../../hooks/useAccentColor";
import "./AccentColorSettingsPanel.css";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounce delay (ms) before persisting a colour change to the server. */
const SAVE_DEBOUNCE_MS = 400;

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
  // Ref to track the debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to track in-flight save request so we can abort on unmount
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to guard against setState calls after unmount
  const mountedRef = useRef(true);

  const { accentColor, passesContrast, setAccentColor } =
    useAccentColor(serverColor);

  // ------------------------------------------------------------------
  // Mount / unmount tracking
  // ------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any in-flight save request
      abortControllerRef.current?.abort();
      // Clear any pending timers
      if (statusTimerRef.current !== null) clearTimeout(statusTimerRef.current);
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ------------------------------------------------------------------
  // Fetch user preference on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchPreference() {
      try {
        const res = await fetch("/api/profile/accent-color", {
          credentials: "same-origin",
        });
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
  // Persist preference when colour changes (called after debounce)
  // ------------------------------------------------------------------
  const saveToServer = useCallback(async (hex: string) => {
    // Cancel any previous in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear any pending status-reset timer before starting a new save
    if (statusTimerRef.current !== null) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }

    if (mountedRef.current) setSaveStatus("saving");

    try {
      const res = await fetch("/api/profile/accent-color", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ accentColor: hex }),
        signal: controller.signal,
      });
      if (mountedRef.current) {
        setSaveStatus(res.ok ? "saved" : "error");
      }
    } catch (err) {
      // AbortError is expected when a newer request supersedes this one
      if (err instanceof Error && err.name === "AbortError") return;
      if (mountedRef.current) setSaveStatus("error");
    } finally {
      if (mountedRef.current) {
        statusTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSaveStatus("idle");
          statusTimerRef.current = null;
        }, 2500);
      }
    }
  }, []);

  // ------------------------------------------------------------------
  // Debounced change handler
  // ------------------------------------------------------------------
  const handleChange = useCallback(
    (hex: string) => {
      setAccentColor(hex);

      // Debounce the server save to avoid hammering the API on every
      // drag event from the native colour picker
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        saveToServer(hex);
      }, SAVE_DEBOUNCE_MS);
    },
    [setAccentColor, saveToServer]
  );

  const handleReset = useCallback(() => {
    // Route through handleChange as the single path so local state +
    // server stay in sync and the debounce is applied consistently.
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

      {/* Picker – reset button is intentionally removed from the picker
          level; the single reset action lives in the panel below. */}
      <section className="accent-settings-panel__picker-section">
        <AccentColorPicker
          value={accentColor}
          onChange={handleChange}
          allowCustom
        />
      </section>

      {/* Contrast feedback – consolidated here.
          The picker shows a warning on fail; this panel shows confirmation
          on pass so the user always gets clear feedback in one place. */}
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

      {/* Single reset action for the whole panel */}
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
