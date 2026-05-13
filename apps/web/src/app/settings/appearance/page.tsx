import React from "react";
import { AccentColorPicker } from "../../components/accent-color-picker";

export const metadata = {
  title: "Appearance — Settings",
};

export default function AppearancePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-white mb-2">Appearance</h1>
      <p className="text-sm text-gray-400 mb-8">
        Customise how xenoform.ai looks for you.
      </p>

      <section className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <AccentColorPicker />
      </section>
    </main>
  );
}
