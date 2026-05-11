import type { Metadata } from 'next';
import { AccentColorProvider } from '@/components/accent-color-provider';

export const metadata: Metadata = {
  title: 'App',
  description: 'App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
          AccentColorProvider is mounted at the root so that the --color-accent
          CSS custom property is available to all pages and components.
          The initial colour defaults to DEFAULT_ACCENT_COLOR; individual pages
          (e.g. ProfilePage) can pass a user-specific saved colour via a nested
          AccentColorProvider that overrides this root one.
        */}
        <AccentColorProvider>
          {children}
        </AccentColorProvider>
      </body>
    </html>
  );
}
