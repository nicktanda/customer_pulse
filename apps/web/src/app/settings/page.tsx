import { AccentColorSettings } from "../components/AccentColorSettings";
import "../styles/accent-color.css";

export default function SettingsPage() {
  return (
    <main className="settings-page">
      <h1>Settings</h1>
      <AccentColorSettings />
    </main>
  );
}
