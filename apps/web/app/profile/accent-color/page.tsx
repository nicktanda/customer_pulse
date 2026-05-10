/**
 * Profile > Accent Colour settings page
 *
 * Protected behind the NEXT_PUBLIC_FEATURE_ACCENT_COLOR feature flag.
 */
import { redirect } from "next/navigation";
import { isAccentColorEnabled } from "../../../lib/featureFlags";
import { AccentColorSettingsPanel } from "./AccentColorSettingsPanel";

export const metadata = {
  title: "Accent Colour – Profile Settings",
  description: "Personalise the accent colour used throughout the interface.",
};

export default function AccentColorPage() {
  if (!isAccentColorEnabled()) {
    redirect("/profile");
  }

  return (
    <main className="accent-color-page">
      <div className="accent-color-page__inner">
        <header className="accent-color-page__header">
          <h1 className="accent-color-page__title">Accent colour</h1>
          <p className="accent-color-page__description">
            Choose the highlight colour used for buttons, links, and active
            states across the app. Your preference is saved to your account and
            synced across devices.
          </p>
        </header>

        <AccentColorSettingsPanel />
      </div>
    </main>
  );
}
