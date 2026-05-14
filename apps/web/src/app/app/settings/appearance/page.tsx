import React from "react";
import { AppearanceSettings } from "@/components/accent-colour/AppearanceSettings";

export const metadata = {
  title: "Appearance – Settings",
};

export default function AppearancePage() {
  return (
    <div className="container-fluid py-4 px-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <h1 className="h4 mb-4">Appearance</h1>
          <AppearanceSettings />
          <div className="mt-4">
            <a href="/app/settings" className="btn btn-link ps-0 text-muted">
              ← Back to Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
