import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearancePage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Appearance
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Customise how the app looks and feels.
      </p>

      <section className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <AccentColorPicker />
        </div>
      </section>
    </div>
  );
}
