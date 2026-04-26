"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  Compass,
  LayoutGrid,
  ClipboardList,
  ListTree,
  UserCircle,
  ChevronDown,
  Map,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarNavItem = {
  href: string;
  label: string;
};

/**
 * A labeled chunk of links (e.g. Learn vs Workspace). **Every** group’s heading toggles
 * when you are outside that group’s URL area (click the uppercase title to show links).
 */
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
  "/app/discover": Compass,
  "/app/discover/map": Map,
  "/app/discover/board": LayoutGrid,
  "/app/discover/workspace": ClipboardList,
  "/app/discover/insights": ListTree,
  "/app/discover/me": UserCircle,
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
 * Discover *Overview* is **only** `/app/discover` (not `/app/discover/map` or other children).
 * *OST Map* is `/app/discover/map` (its own page; the same canvas is also embedded on the hub).
 */
function isNavActive(pathname: string, href: string) {
  const pathOnly = href.split("#")[0] ?? href;

  if (pathOnly === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  if (pathOnly === "/app/discover") {
    return pathname === "/app/discover" || pathname === "/app/discover/";
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

/**
 * True when the current page lives “under” this nav item (used to auto-expand a sidebar section).
 * `/app` (Dashboard) is **exact** only so the Learn group doesn’t claim `/app/discover` etc.
 * The Discover **Overview** item (`/app/discover`) matches the hub and every child path under
 * `/app/discover/…` (e.g. activity detail) even though those URLs are not all listed as items.
 */
function isPathInNavSubtree(pathname: string, itemHref: string): boolean {
  if (itemHref === "/app") {
    return pathname === "/app" || pathname === "/app/";
  }
  if (itemHref === "/app/discover") {
    return (
      pathname === "/app/discover" ||
      pathname === "/app/discover/" ||
      pathname.startsWith("/app/discover/")
    );
  }
  return (
    pathname === itemHref || pathname === `${itemHref}/` || pathname.startsWith(`${itemHref}/`)
  );
}

function pathnameInGroupArea(pathname: string, items: SidebarNavItem[]): boolean {
  return items.some((item) => isPathInNavSubtree(pathname, item.href));
}

function SubNavLink({
  pathname,
  item,
}: {
  pathname: string;
  item: SidebarNavItem;
}) {
  const active = isNavActive(pathname, item.href);
  const Icon = NAV_ICONS[item.href];
  return (
    <Link
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
}

/**
 * One main sidebar section. When the route matches **any** item in the group, the sub-links
 * are shown and the title is a plain heading. Otherwise the title is a chevron **button** you tap
 * to open that group (so the list stays short on first load or when working in another area).
 */
function NavGroupSection({
  group,
  groupIndex,
  pathname,
}: {
  group: SidebarNavGroup;
  groupIndex: number;
  pathname: string;
}) {
  const { items, label } = group;
  const inThisArea = pathnameInGroupArea(pathname, items);
  // Lets you open a group from another area (e.g. peek at Workspace) without navigating there yet.
  const [openWhileOutside, setOpenWhileOutside] = useState(false);

  const showSublinks = inThisArea || openWhileOutside;
  // Navigating out of a group’s routes collapses the “peek” so old sections don’t stay open in the way.
  useEffect(() => {
    if (!inThisArea) {
      setOpenWhileOutside(false);
    }
  }, [inThisArea]);

  const headingStyle = {
    letterSpacing: "0.07em" as const,
    fontSize: "0.6875rem",
    borderLeft: "2px solid var(--bs-primary)",
    paddingLeft: "0.4rem",
  };

  return (
    <section
      className={groupIndex > 0 ? "mt-3 pt-3 border-top border-secondary-subtle" : ""}
      aria-labelledby={`sidebar-nav-${groupIndex}`}
    >
      {inThisArea ? (
        <h2
          id={`sidebar-nav-${groupIndex}`}
          className="small fw-semibold text-uppercase text-body-secondary mb-2"
          style={headingStyle}
        >
          {label}
        </h2>
      ) : (
        <button
          type="button"
          id={`sidebar-nav-${groupIndex}`}
          className="w-100 d-flex align-items-center justify-content-between text-start text-uppercase small fw-semibold text-body-secondary mb-2 border-0 bg-transparent p-0 rounded-1"
          style={{ ...headingStyle, cursor: "pointer" }}
          aria-expanded={showSublinks}
          aria-controls={showSublinks ? `sidebar-nav-children-${groupIndex}` : undefined}
          onClick={() => setOpenWhileOutside((v) => !v)}
        >
          <span>{label}</span>
          <ChevronDown
            size={14}
            className="text-body-secondary flex-shrink-0 me-0"
            style={{
              transform: showSublinks ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
            aria-hidden="true"
          />
        </button>
      )}
      {showSublinks ? (
        <nav
          id={`sidebar-nav-children-${groupIndex}`}
          className={`nav nav-pills flex-column gap-1${inThisArea ? " mt-0" : " ms-1 mt-1 ps-2 border-start border-secondary-subtle"}`}
          aria-label={label}
        >
          {items.map((item) => (
            <SubNavLink key={item.href} pathname={pathname} item={item} />
          ))}
        </nav>
      ) : null}
    </section>
  );
}

export function SidebarNav({ groups, children }: { groups: SidebarNavGroup[]; children?: ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="mt-3">
      {groups.map((group, groupIndex) => (
        <NavGroupSection
          key={`${group.label}-${groupIndex}`}
          group={group}
          groupIndex={groupIndex}
          pathname={pathname}
        />
      ))}
      {children ? <div className="nav flex-column gap-1 mt-2">{children}</div> : null}
    </div>
  );
}
