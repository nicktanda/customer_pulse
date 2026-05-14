import React from "react";
import { AccentColourPicker } from "@/components/AccentColourPicker";
import { AccentColourProvider } from "@/components/AccentColourProvider";

export const metadata = {
  title: "Appearance — Settings",
};

export default function AppearanceSettingsPage() {
  return (
    <AccentColourProvider>
      <div className="container-fluid py-4" style={{ maxWidth: 640 }}>
        <h2 className="h4 fw-bold mb-1">Appearance</h2>
        <p className="text-muted mb-4">
          Personalise the look and feel of the app. Your preferences are saved
          to this browser.
        </p>

        {/* Accent colour */}
        <div className="card border shadow-sm mb-4">
          <div className="card-body">
            <h3 className="h6 fw-semibold mb-1">Accent colour</h3>
            <p className="text-muted small mb-3">
              Sets the highlight colour used on buttons, links, and interactive
              elements. All options meet WCAG AA contrast requirements.
            </p>
            <AccentColourPicker />
          </div>
        </div>
      </div>
    </AccentColourProvider>
  );
}
