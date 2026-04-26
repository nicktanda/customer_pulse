"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  BarChart2,
  Target,
  Mail,
  Wrench,
  Monitor,
  Plug,
  Users,
  Zap,
  Settings,
  FolderOpen,
  Wand2,
  ShieldCheck,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarNavItem = {
  href: string;
  label: string;
};

/** A labeled chunk of links (e.g. Work vs Setup) so the sidebar matches how people think about tasks. */
export type SidebarNavGroup = { label: string; items: SidebarNavItem[] };

/*
 * Maps each known route href to its Lucide icon. This lives in the client component
 * so we never try to pass React component references across the server/client boundary.
 */
const NAV_ICONS: Record<string, LucideIcon> = {
  "/app": LayoutDashboard,
  "/app/feedback": MessageSquare,
  "/app/learn/feedback": MessageSquare,
  "/app/insights": Lightbulb,
  "/app/learn/insights": Lightbulb,
  "/app/reporting": BarChart2,
  "/app/strategy": Target,
  "/app/pulse-reports": Mail,
  "/app/build": Wrench,
  "/app/build/specs": Wrench,
  "/app/discover": Search,
  "/app/monitor": Monitor,
  "/app/integrations": Plug,
  "/app/recipients": Users,
  "/app/skills": Zap,
  "/app/settings": Settings,
  "/app/projects": FolderOpen,
  "/app/onboarding": Wand2,
  "/app/admin": ShieldCheck,
};

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
          <h2
            id={`sidebar-nav-${groupIndex}`}
            className="small fw-semibold text-uppercase text-body-secondary mb-2"
            style={{
              letterSpacing: "0.07em",
              fontSize: "0.6875rem",
              /* Ember-coloured left border marks each section as a labelled group */
              borderLeft: "2px solid var(--bs-primary)",
              paddingLeft: "0.4rem",
            }}
          >
            {group.label}
          </h2>
          <nav className="nav nav-pills flex-column gap-1" aria-label={group.label}>
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = NAV_ICONS[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link py-2 px-2 rounded d-flex align-items-center gap-2${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  style={{ fontSize: "0.875rem" }}
                >
                  {Icon ? (
                    <Icon
                      size={15}
                      aria-hidden="true"
                      style={{ flexShrink: 0, opacity: active ? 1 : 0.85 }}
                    />
                  ) : null}
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
