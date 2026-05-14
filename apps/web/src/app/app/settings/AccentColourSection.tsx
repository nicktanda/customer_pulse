"use client";

import dynamic from "next/dynamic";
import { type AccentId } from "../../components/AccentColourProvider";

const AccentColourPicker = dynamic(
  () => import("../../components/AccentColourPicker"),
  { ssr: false }
);

interface AccentColourSectionProps {
  initialAccentId?: string | null;
  onSave?: (accentId: AccentId) => Promise<void>;
}

export default function AccentColourSection({
  initialAccentId,
  onSave,
}: AccentColourSectionProps) {
  return (
    <section className="mb-4">
      <h5 className="mb-3">Appearance</h5>
      <div className="card">
        <div className="card-body">
          <AccentColourPicker
            initialAccentId={initialAccentId}
            onSave={onSave}
          />
        </div>
      </div>
    </section>
  );
}
