import type { Metadata } from 'next';
import { AccentColourProvider } from '@/components/AccentColourProvider';
import { AccentColourStyles } from '@/components/AccentColourStyles';
import './globals.css';

export const metadata: Metadata = {
  title: 'Customer Pulse',
  description: 'Customer Pulse application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <AccentColourStyles />
      </head>
      <body>
        <AccentColourProvider>{children}</AccentColourProvider>
      </body>
    </html>
  );
}
