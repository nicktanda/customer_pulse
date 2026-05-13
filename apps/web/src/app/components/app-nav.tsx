"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/settings/appearance", label: "Appearance" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-6 px-6 py-3 border-b border-gray-700 bg-gray-900"
    >
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={[
            "text-sm font-medium transition-colors",
            pathname === href
              ? "text-white"
              : "text-gray-400 hover:text-white",
          ].join(" ")}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
