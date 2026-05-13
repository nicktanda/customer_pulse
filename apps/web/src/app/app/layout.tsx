import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import AccentColourProvider from '../../components/AccentColourProvider';
import { isAccentColourPickerEnabled } from '../../lib/accentColour';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  return (
    <>
      {isAccentColourPickerEnabled() && <AccentColourProvider />}
      {children}
    </>
  );
}
