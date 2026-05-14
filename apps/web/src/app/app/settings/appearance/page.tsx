import React from "react";
import AccentColourPicker from "../../../../components/AccentColourPicker";

export const metadata = {
  title: "Appearance — Settings",
};

export default function AppearanceSettingsPage() {
  return (
    <div className="container py-4" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-1">Appearance</h1>
      <p className="text-muted mb-4">
        Personalise how the app looks for you.
      </p>

      <AccentColourPicker />
    </div>
  );
}
