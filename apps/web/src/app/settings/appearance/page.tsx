import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export const metadata = {
  title: "Appearance – Settings",
  description: "Customise the look and feel of the application.",
};

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Appearance
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personalise how the interface looks for you.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-6">
        <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Colour
        </h2>
        <AccentColorPicker />
      </section>
    </div>
  );
}
