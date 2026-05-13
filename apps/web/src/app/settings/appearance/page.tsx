import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearanceSettingsPage() {
  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Appearance
      </h1>
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <AccentColorPicker />
      </section>
    </main>
  );
}
