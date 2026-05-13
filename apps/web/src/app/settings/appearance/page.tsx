import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearanceSettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Appearance</h1>
        <p className="mt-1 text-sm text-gray-400">
          Customise how the app looks and feels.
        </p>
      </div>

      <section className="rounded-xl border border-gray-700 bg-gray-900 p-6 space-y-6">
        <AccentColorPicker />
      </section>
    </main>
  );
}
