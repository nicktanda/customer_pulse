import React from "react";
import { AccentColourPicker } from "../../../../components/accent-colour";

export const metadata = {
  title: "Appearance – Settings",
};

export default function AppearanceSettingsPage() {
  return (
    <div className="container-fluid py-4" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-1">Appearance</h1>
      <p className="text-muted mb-4" style={{ fontSize: "0.875rem" }}>
        Personalise the look of the app. Your preferences are saved in your browser.
      </p>

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h6 mb-3">Accent colour</h2>
          <AccentColourPicker />
        </div>
      </div>
    </div>
  );
}
