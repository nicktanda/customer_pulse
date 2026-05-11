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
  return {
    // data-bs-theme is fixed to dark; xenoform.ai is a single-theme app.
  } && (
    <html lang="en" data-bs-theme="dark">
      <body className="min-vh-100 antialiased bg-body text-body">
        <Providers>
          {/*
            AccentColorProvider is mounted at the root so that the --color-accent
            CSS custom property is available to all pages and components.
            The `enabled` prop is intentionally omitted here (defaults to true)
            so the CSS custom property is always registered. The feature flag
            only controls whether the picker UI is visible to the user; having
            the property set to its default value causes no visible change when
            the flag is off.
          */}
          <AccentColorProvider>
            {children}
          </AccentColorProvider>
        </Providers>
      </body>
    </html>
  );
}
