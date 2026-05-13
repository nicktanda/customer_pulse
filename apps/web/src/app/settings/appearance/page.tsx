import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export const metadata = {
  title: "Appearance — xenoform.ai",
  description: "Customise the accent colour used throughout the app.",
};

export default function AppearancePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">Appearance</h1>
      <p className="text-sm text-gray-400 mb-8">
        Personalise how xenoform.ai looks for you. Changes are saved automatically.
      </p>

      <section
        aria-labelledby="accent-colour-heading"
        className="rounded-xl border border-gray-700 bg-gray-800/50 p-6"
      >
        <h2
          id="accent-colour-heading"
          className="text-base font-medium text-gray-200 mb-4"
        >
          Accent colour
        </h2>
        <AccentColorPicker />
      </section>
    </main>
  );
}
