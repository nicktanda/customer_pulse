import { cookies } from "next/headers";
import { ACCENT_COLOUR_STORAGE_KEY } from "@/components/accent-colour/accent-colours";
import { AppearanceSettingsClient } from "./AppearanceSettingsClient";

export const metadata = {
  title: "Appearance Settings",
};

export default async function AppearancePage() {
  const cookieStore = await cookies();
  const storedColour = cookieStore.get(ACCENT_COLOUR_STORAGE_KEY)?.value ?? "blue";

  return (
    <div className="container py-4" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-1">Settings</h1>
      <p className="text-muted mb-4">Manage your account and appearance preferences.</p>

      <div className="card shadow-sm">
        <div className="card-body">
          <AppearanceSettingsClient initialColourId={storedColour} />
        </div>
      </div>
    </div>
  );
}
