/**
 * Layout for the appearance settings route.
 * Ensures the AccentColourAppShell (flash-prevention script + provider)
 * wraps the settings page within the authenticated app tree.
 */
import { AccentColourAppShell } from "@/components/accent-colour/AccentColourAppShell";

export default function AppearanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccentColourAppShell>{children}</AccentColourAppShell>;
}
