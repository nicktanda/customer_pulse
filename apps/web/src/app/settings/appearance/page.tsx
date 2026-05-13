import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Appearance
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customise how the app looks and feels.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
        <div>
          <h2 className="text-base font-medium text-gray-900 dark:text-white">
            Accent colour
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Choose the accent colour used for buttons, links, and focus
            indicators throughout the app.
          </p>
        </div>
        <AccentColorPicker />
      </section>
    </div>
  );
}
