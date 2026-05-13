import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Appearance
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customise how the app looks and feels.
        </p>
      </div>

      <section aria-labelledby="accent-colour-heading">
        <h2
          id="accent-colour-heading"
          className="text-base font-medium text-gray-800 dark:text-gray-200 mb-4"
        >
          Accent colour
        </h2>
        <AccentColorPicker />
      </section>
    </div>
  );
}
