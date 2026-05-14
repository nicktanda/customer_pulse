import React from "react";
import Link from "next/link";
import { SettingsNavLinks } from "@/components/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12 col-md-3 mb-4 mb-md-0">
          <nav aria-label="Settings navigation">
            <ul className="nav flex-column">
              <li className="nav-item">
                <Link href="/app/settings" className="nav-link px-0">
                  General
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/app/settings/appearance"
                  className="nav-link px-0"
                >
                  Appearance
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="col-12 col-md-9">{children}</div>
      </div>
    </div>
  );
}
