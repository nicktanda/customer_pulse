import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { users } from "@customer-pulse/db/client";
import { signOutAction } from "./actions";
import { ensureCurrentProjectCookie } from "@/lib/current-project";
import { ResponsiveSidebar } from "./ResponsiveSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarNav, type SidebarNavGroup, type SidebarNavItem } from "@/components/SidebarNav";

/**
 * Build inbox-first nav groups. Onboarding is only shown while the wizard is incomplete — once finished,
 * `/app/onboarding` redirects to the dashboard, so hiding the link avoids a confusing no-op.
 */
function sidebarNavGroups(onboardingComplete: boolean): SidebarNavGroup[] {
  const workspaceItems: SidebarNavItem[] = [];
  if (!onboardingComplete) {
    workspaceItems.push({ href: "/app/onboarding", label: "Setup wizard" });
  }
  workspaceItems.push(
    { href: "/app/integrations", label: "Integrations" },
    { href: "/app/recipients", label: "Email recipients" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/projects", label: "Projects" },
  );

  return [
    {
      label: "Work",
      items: [
        { href: "/app", label: "Dashboard" },
        { href: "/app/feedback", label: "Feedback" },
      ],
    },
    {
      label: "Insights & reports",
      items: [
        { href: "/app/insights", label: "Insights" },
        { href: "/app/pulse-reports", label: "Pulse reports" },
        { href: "/app/reporting", label: "Reporting" },
        { href: "/app/strategy", label: "Strategy" },
      ],
    },
    {
      label: "Workspace",
      items: workspaceItems,
    },
  ];
}

/**
 * Authenticated shell: sidebar IA is task-based (work → insights → workspace).
 * Current project is stored in an httpOnly cookie (server-side only; not readable by browser JS).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  // Load the user row from Postgres so we can enforce onboarding completion like a before_filter would.
  const db = getDb();
  const [userRow] = await db
    .select({ onboardingCompletedAt: users.onboardingCompletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // `middleware.ts` attaches this header so we can tell we are on the wizard (no cookie redirect loop).
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isOnboardingPath = pathname.startsWith("/app/onboarding");

  // Incomplete onboarding → send users to the wizard only.
  if (!userRow?.onboardingCompletedAt && !isOnboardingPath) {
    redirect("/app/onboarding");
  }

  // After onboarding, ensure a current project is selected — stored in an httpOnly cookie.
  if (userRow?.onboardingCompletedAt && !isOnboardingPath) {
    await ensureCurrentProjectCookie(userId);
  }

  const bullBoardUrl = process.env.NEXT_PUBLIC_BULL_BOARD_URL;
  const isAdmin = session.user.role === 1;

  return (
    // On large screens the shell is viewport-tall and only `main` scrolls — so master–detail panels can
    // `position: sticky; top: 0` against the main pane (Notion-style side peek), not the browser chrome.
    <div className="d-flex min-vh-100 app-layout-shell">
      <ResponsiveSidebar>
        <p className="small fw-semibold text-uppercase text-body-secondary mb-0">Customer Pulse</p>
        <SidebarNav groups={sidebarNavGroups(Boolean(userRow?.onboardingCompletedAt))}>
          {isAdmin && bullBoardUrl ? (
            <a
              href={bullBoardUrl}
              target="_blank"
              rel="noreferrer"
              className="nav-link py-2 px-2 rounded text-body-secondary"
            >
              Job queue (admin)
            </a>
          ) : null}
        </SidebarNav>
        <div className="mt-auto pt-4 border-top border-secondary-subtle">
          <ThemeToggle />
          <p className="small text-truncate text-body-secondary mb-1">
            <span className="fw-medium text-body">{session.user.email}</span>
          </p>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-link btn-sm p-0 text-decoration-none">
              Sign out
            </button>
          </form>
        </div>
      </ResponsiveSidebar>
      <main className="flex-grow-1 min-w-0 bg-body-tertiary px-4 pb-4 pt-5 p-lg-5 app-main-pane">
        {children}
      </main>
    </div>
  );
}
