import { AppearanceSettings } from '../../../components/AppearanceSettings';
import { AccentColourInitializer } from '../../../components/AccentColourInitializer';

export default function SettingsPage() {
  return (
    <>
      <AccentColourInitializer />
      <AppearanceSettings />
    </>
  );
}
