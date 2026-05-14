import React from "react";
import Link from "next/link";

const SETTINGS_NAV = [
  { href: "/app/settings", label: "General" },
  { href: "/app/settings/appearance", label: "Appearance" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="d-flex" style={{ minHeight: "100%" }}>
      {/* Sidebar */}
      <aside
        className="border-end bg-light"
        style={{ width: 200, flexShrink: 0, padding: "1.5rem 0" }}
      >
        <p
          className="px-3 text-uppercase"
          style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "#6c757d" }}
        >
          Settings
        </p>
        <nav>
          <ul className="list-unstyled mb-0">
            {SETTINGS_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="d-block px-3 py-2 text-decoration-none"
                  style={{ fontSize: "0.875rem", color: "inherit" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
    </div>
  );
}
