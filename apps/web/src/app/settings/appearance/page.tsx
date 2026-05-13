import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export const metadata = {
  title: "Appearance — xenoform.ai",
  description: "Personalise the accent colour used throughout the app.",
};

export default function AppearancePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">
            Appearance
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Customise how xenoform.ai looks for you.
          </p>
        </div>

        <hr className="border-gray-700" />

        <section aria-labelledby="accent-colour-heading">
          <h2
            id="accent-colour-heading"
            className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4"
          >
            Accent colour
          </h2>
          <AccentColorPicker />
        </section>
      </div>
    </main>
  );
}
