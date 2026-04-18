"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type SidebarNavItem = { href: string; label: string };

/** A labeled chunk of links (e.g. Work vs Setup) so the sidebar matches how people think about tasks. */
export type SidebarNavGroup = { label: string; items: SidebarNavItem[] };

/**
 * Highlights the current app section using the URL path (Dashboard is exact `/app` only).
 */
function isNavActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ groups, children }: { groups: SidebarNavGroup[]; children?: ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="mt-3">
      {groups.map((group, groupIndex) => (
        <section
          key={group.label}
          className={groupIndex > 0 ? "mt-3 pt-3 border-top border-secondary-subtle" : ""}
          aria-labelledby={`sidebar-nav-${groupIndex}`}
        >
          <h2 id={`sidebar-nav-${groupIndex}`} className="small fw-semibold text-uppercase text-body-secondary mb-2">
            {group.label}
          </h2>
          {/* `nav-pills` gives Bootstrap’s `.active` hooks; look is overridden in globals.css (soft tint). */}
          <nav className="nav nav-pills flex-column gap-1" aria-label={group.label}>
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link py-2 px-2 rounded${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </section>
      ))}
      {children ? <div className="nav flex-column gap-1 mt-2">{children}</div> : null}
    </div>
  );
}
