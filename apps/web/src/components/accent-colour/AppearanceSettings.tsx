"use client";

import React from "react";
import { AccentColourPicker } from "./AccentColourPicker";

export function AppearanceSettings() {
  return (
    <section aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="h5 mb-3">
        Appearance
      </h2>
      <div className="card border-0 bg-body-tertiary p-3 rounded-3">
        <AccentColourPicker />
        <p className="text-muted small mb-0">
          Your accent colour is saved in this browser. It applies to buttons,
          links, and interactive elements across the app.
        </p>
      </div>
    </section>
  );
}
