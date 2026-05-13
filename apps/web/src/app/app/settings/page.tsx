import { AccentColourPickerSection } from "../../components/AccentColourPickerSection";

export const metadata = {
  title: "Settings | Customer Pulse",
};

export default function SettingsPage() {
  return (
    <main className="container py-4">
      <h1 className="mb-4">Settings</h1>

      <section className="mb-4">
        <h2 className="h5 mb-3">Appearance</h2>
        <AccentColourPickerSection />
      </section>
    </main>
  );
}
