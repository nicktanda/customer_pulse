"use client";

import React from "react";
import { AccentColorPicker } from "../../../components/AccentColorPicker";
import { useAccentColor } from "../../../hooks/useAccentColor";
import { isFeatureEnabled } from "../../../lib/feature-flags";
import "../../../components/AccentColorPicker.css";
import "./page.css";

/**
 * Appearance settings page.
 *
 * Renders the accent colour picker (behind the ACCENT_COLOR_PICKER feature flag)
 * alongside any other appearance settings that exist in this section.
 */
export default function AppearanceSettingsPage() {
  const { accentColor, contrastWarning, setAccentColor, resetAccentColor, isSaving, saveError } =
    useAccentColor();

  const flagEnabled = isFeatureEnabled("ACCENT_COLOR_PICKER");

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Appearance</h1>
        <p className="settings-page__subtitle">
          Personalise how the interface looks for you.
        </p>
      </header>

      <section className="settings-section">
        <h2 className="settings-section__title">Theme</h2>
        {/* Existing theme settings live here */}
      </section>

      {flagEnabled && (
        <section className="settings-section">
          <h2 className="settings-section__title">Accent colour</h2>
          <p className="settings-section__description">
            Choose a colour used for buttons, links, and active states throughout
            the app. Your preference is saved to your account.
          </p>

          <AccentColorPicker
            value={accentColor}
            onChange={setAccentColor}
            isSaving={isSaving}
            contrastWarning={contrastWarning}
          />

          {saveError && (
            <p className="settings-save-error" role="alert">
              ⚠ Could not save your preference: {saveError}
            </p>
          )}

          <button
            type="button"
            onClick={resetAccentColor}
            className="settings-reset-btn"
            disabled={isSaving}
          >
            Reset to default
          </button>
        </section>
      )}
    </div>
  );
}
