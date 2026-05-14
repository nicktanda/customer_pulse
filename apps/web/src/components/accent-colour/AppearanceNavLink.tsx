"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Appearance settings nav link — rendered inside the sidebar.
 * Uses an SVG palette icon so it fits alongside other sidebar items.
 */
export function AppearanceNavLink() {
  const pathname = usePathname();
  const isActive = pathname?.startsWith("/app/settings/appearance");

  return (
    <Link
      href="/app/settings/appearance"
      className={`nav-link d-flex align-items-center gap-2${
        isActive ? " active" : ""
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
  );
}
