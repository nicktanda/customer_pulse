import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearancePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-100 mb-1">Appearance</h1>
      <p className="text-sm text-gray-400 mb-8">
        Customise how the app looks and feels.
      </p>

      <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
        <AccentColorPicker />
      </section>
    </main>
  );
}
