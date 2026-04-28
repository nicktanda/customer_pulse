import { AppTabBar, type AppTabItem } from "@/components/ui/AppTabBar";

type ReportingTab = "overview" | "ask";

interface ReportingTabBarProps {
  /** Which tab is currently active — drives `aria-current` and the active visual style. */
  activeTab: ReportingTab;
  /** Current time range in days — preserved in every tab link’s `href`. */
  rangeDays: number;
}

/**
 * Reporting-specific tab row (Overview vs Ask AI) built on the shared `AppTabBar`.
 * URLs stay `?tab=overview|ask&range=7|30|90` so bookmarks and shared links keep working.
 */
export function ReportingTabBar({ activeTab, rangeDays }: ReportingTabBarProps) {
  const items: AppTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      href: `/app/reporting?range=${rangeDays}&tab=overview`,
    },
    {
      id: "ask",
      label: (
        <>
          Ask AI{" "}
          {/* Small sparkle so the AI tab is easy to spot; decorative only for screen readers */}
          <span className="app-tab-bar__accent-icon" aria-hidden="true">
            ✦
          </span>
        </>
      ),
      href: `/app/reporting?range=${rangeDays}&tab=ask`,
      accent: true,
    },
  ];

  return <AppTabBar items={items} activeId={activeTab} ariaLabel="Reporting views" />;
}
