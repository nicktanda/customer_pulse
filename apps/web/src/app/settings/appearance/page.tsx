import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export const metadata = {
  title: "Appearance — Settings",
  description: "Customise the accent colour and visual appearance of the app.",
};

export default function AppearancePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Appearance
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personalise how the app looks for you.
        </p>
      </div>

      <section
        aria-labelledby="accent-colour-heading"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
      >
        <h2
          id="accent-colour-heading"
          className="text-base font-medium text-gray-900 dark:text-white mb-4"
        >
          Accent colour
        </h2>
        <AccentColorPicker />
      </section>
    </main>
  );
}
