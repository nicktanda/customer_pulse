import { AccentColorPicker } from "../../components/accent-color-picker";

export default function AppearancePage() {
  return (
    <div className="app-page-shell app-page-shell--medium py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Appearance
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customise how the app looks and feels.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <AccentColorPicker />
        </div>
      </div>
    </div>
  );
}
