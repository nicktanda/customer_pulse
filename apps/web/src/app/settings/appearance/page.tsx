import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearancePage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Appearance
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customise how the app looks and feels.
        </p>
      </div>

      <section className="space-y-4">
        <AccentColorPicker />
      </section>
    </div>
  );
}
