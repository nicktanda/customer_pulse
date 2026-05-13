import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="container py-4" style={{ maxWidth: "640px" }}>
      <h1 className="h4 mb-4">Settings</h1>
      <div className="list-group">
        <Link
          href="/app/settings/appearance"
          className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
        >
          <span style={{ fontSize: "1.25rem" }}>🎨</span>
          <div>
            <div style={{ fontWeight: 600 }}>Appearance</div>
            <div className="text-muted" style={{ fontSize: "0.82rem" }}>
              Accent colour, theme and interface preferences
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
