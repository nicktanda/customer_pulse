import React from "react";
import { AccentColourPicker } from "@/components/accent-colour";

export const metadata = {
  title: "Appearance Settings",
};

export default function AppearancePage() {
  return (
    <div className="container py-4" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-1">Appearance</h1>
      <p className="text-muted mb-4" style={{ fontSize: "0.875rem" }}>
        Personalise how the app looks for you.
      </p>

      <div className="card shadow-sm">
        <div className="card-body">
          <AccentColourPicker />
        </div>
      </div>
    </div>
  );
}
