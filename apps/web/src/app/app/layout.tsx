import { AccentColourInitializer } from '@/components/AccentColourInitializer';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AccentColourInitializer />
      {children}
    </>
  );
}
