import Link from "next/link";
import type { ReactNode } from "react";

/** One tab in an `AppTabBar` row — each entry is a real URL (bookmarkable, server-rendered). */
export type AppTabItem = {
  id: string;
  label: ReactNode;
  href: string;
  /** Accent tab (e.g. AI) — when inactive, still reads as a control (subtle border/tint). */
  accent?: boolean;
};

export type AppTabBarProps = {
  items: AppTabItem[];
  /** Must match one item’s `id` — usually from your route or `searchParams` parser. */
  activeId: string;
  /** Accessible name for the tab row (e.g. “Reporting views”). */
  ariaLabel?: string;
};

/**
 * Horizontal tab row built from **links**, not ARIA tab widgets.
 *
 * **Accessibility:** We use `aria-current="page"` on the active link because each tab is a
 * separate URL. That matches how Reporting (and similar pages) work: full navigation, not
 * in-page panel swapping. If you ever need arrow-key `role="tablist"` behaviour, you’d add
 * client state and coordinate `aria-selected` — this component intentionally stays server-friendly.
 *
 * **Adding a third tab:** Append another object to `items` with a unique `id`, `href`, and
 * `label`, then pass the matching `activeId` from the parent (e.g. after parsing `?tab=`).
 */
export function AppTabBar({ items, activeId, ariaLabel = "Sections" }: AppTabBarProps) {
  return (
    <nav className="app-tab-bar-nav" aria-label={ariaLabel}>
      <div className="app-tab-bar d-flex flex-wrap align-items-end">
        {items.map((item) => {
          const active = item.id === activeId;
          const classNames = [
            "app-tab-bar__link",
            "text-decoration-none",
            "d-inline-flex align-items-center gap-1",
            active ? "app-tab-bar__link--active" : "",
            item.accent ? "app-tab-bar__link--accent" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={item.id}
              href={item.href}
              className={classNames}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
