"use client";

import Link from "next/link";

type ReportingTab = "overview" | "ask";

interface ReportingTabBarProps {
  /** Which tab is currently active — drives the aria-current and visual highlight. */
  activeTab: ReportingTab;
  /** Current time range in days — preserved in the tab link hrefs. */
  rangeDays: number;
}

/**
 * Bootstrap nav-tabs bar for the Reporting page.
 * Uses plain <Link> elements so switching tabs is a server navigation (URL-based),
 * which keeps the page as a Server Component and makes tabs bookmarkable.
 */
export function ReportingTabBar({ activeTab, rangeDays }: ReportingTabBarProps) {
  return (
    <ul className="nav nav-tabs" role="tablist">
      <li className="nav-item" role="presentation">
        <Link
          href={`/app/reporting?range=${rangeDays}&tab=overview`}
          className={`nav-link${activeTab === "overview" ? " active" : ""}`}
          aria-current={activeTab === "overview" ? "page" : undefined}
          role="tab"
        >
          Overview
        </Link>
      </li>
      <li className="nav-item" role="presentation">
        <Link
          href={`/app/reporting?range=${rangeDays}&tab=ask`}
          className={`nav-link${activeTab === "ask" ? " active" : ""}`}
          aria-current={activeTab === "ask" ? "page" : undefined}
          role="tab"
        >
          {/* Small sparkle icon helps users notice the AI feature */}
          Ask AI{" "}
          <span className="ms-1" aria-hidden="true" style={{ fontSize: "0.75em", opacity: 0.7 }}>
            ✦
          </span>
        </Link>
      </li>
    </ul>
  );
}
