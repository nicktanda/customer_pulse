import Link from 'next/link';
import { AppearanceSettings } from '@/components/AppearanceSettings';

export const metadata = {
  title: 'Appearance Settings',
};

export default function AppearancePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/settings"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Settings
        </Link>
      </div>
      <AppearanceSettings />
    </main>
  );
}
