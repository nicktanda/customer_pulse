import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { AccentColorProvider } from '@/components/accent-color-provider';

export const metadata: Metadata = {
  title: 'xenoform.ai',
  description: 'Adaptive customer feedback intelligence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // data-bs-theme is fixed to dark; xenoform.ai is a single-theme app.
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        {/*
          AccentColorProvider is mounted at the root so that the --color-accent
          CSS custom property is available to all pages and components.
          The initial colour defaults to DEFAULT_ACCENT_COLOR; individual pages
          (e.g. ProfilePage) can pass a user-specific saved colour via a nested
          AccentColorProvider that overrides this root one.

          NOTE: Both this root provider and any nested provider write to the
          same document.documentElement CSS property, so whichever renders last
          wins. This is safe for the current single-nesting use case but could
          silently conflict if multiple nested providers exist simultaneously
          (e.g. concurrent route segments).
        */}
        <AccentColorProvider>
          <Providers>{children}</Providers>
        </AccentColorProvider>
      </body>
    </html>
  );
}
