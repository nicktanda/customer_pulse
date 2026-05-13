import Link from 'next/link';

export const metadata = {
  title: 'Settings',
};

const SETTINGS_SECTIONS = [
  {
    href: '/settings/appearance',
    label: 'Appearance',
    description: 'Personalise colours and display preferences.',
  },
];

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>
      <nav aria-label="Settings sections">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {SETTINGS_SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {section.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {section.description}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
