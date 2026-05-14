/**
 * SettingsNavSection
 *
 * A self-contained nav section that can be dropped into the app sidebar.
 * It renders a "Settings" group with an Appearance link.
 *
 * Import this in apps/web/src/app/app/layout.tsx (or the sidebar component)
 * to surface the Appearance settings page from the navigation.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsNavSection() {
  const pathname = usePathname();

  const isAppearanceActive = pathname?.startsWith("/app/settings/appearance");

  return (
    <div className="mt-auto pt-3 border-top">
      <p className="px-3 mb-1 text-uppercase text-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>
        Settings
      </p>
      <Link
        href="/app/settings/appearance"
        className={`nav-link d-flex align-items-center gap-2 px-3 py-2${
          isAppearanceActive ? " active" : ""
        }`}
      >
        {/* Palette icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M8 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.5 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
          <path d="M16 8c0 3.15-1.866 2.585-3.567 2.07C11.42 9.763 10.465 9.473 10 10c-.603.683-.475 1.819-.351 2.92C9.826 14.495 9.996 16 8 16a8 8 0 1 1 8-8zm-8 7c.611 0 .654-.171.655-.176.078-.146.124-.461.016-1.27-.114-.932-.167-2.05.37-2.663.684-.774 1.999-.67 3.054-.351.984.29 1.905.56 1.905-.54a7 7 0 1 0-7 7z" />
        </svg>
        Appearance
      </Link>
    </div>
  );
}
