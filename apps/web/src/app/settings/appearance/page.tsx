import { AccentColorPicker } from "../../components/accent-color-picker";

export const metadata = {
  title: "Appearance – Settings",
  description: "Customise the accent colour and visual preferences for your workspace.",
};

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Appearance
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personalise the look and feel of the app.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-6">
        <AccentColorPicker />
      </section>
    </div>
  );
}
