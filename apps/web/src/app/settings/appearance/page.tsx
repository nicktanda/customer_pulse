import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearancePage() {
  return (
    <main className="min-h-screen bg-[var(--xf-bg)] text-[var(--xf-text)] p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Appearance</h1>
          <p className="text-sm text-gray-400">
            Customise the look and feel of the application.
          </p>
        </div>

        <section className="rounded-xl border border-[var(--xf-border-soft)] bg-[var(--xf-surface)] p-6">
          <AccentColorPicker />
        </section>
      </div>
    </main>
  );
}
