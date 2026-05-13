"use client";

import React from "react";
import AccentColorPicker, {
  type AccentSwatchId,
} from "./AccentColorPicker";
import "./AccentColorPicker.css";

export default function AppearanceSettings() {
  function handleAccentSave(id: AccentSwatchId) {
    // Placeholder – wire up to your user-preferences API call here
    console.info("[AppearanceSettings] accent saved:", id);
  }

  return (
    <section className="appearance-settings">
      <h2 className="appearance-settings__heading">Appearance</h2>
      <p className="appearance-settings__subheading">
        Personalise how the app looks. Your preferences are stored locally and
        applied instantly.
      </p>

      <div className="appearance-settings__section">
        <h3 className="appearance-settings__section-title">Accent colour</h3>
        <AccentColorPicker onSave={handleAccentSave} />
      </div>
    </section>
  );
}
