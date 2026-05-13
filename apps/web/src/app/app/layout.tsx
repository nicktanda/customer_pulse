import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import {
  getUserAuthDb,
  getRequestDb,
  isMultiTenant,
  resolveTenantForRequest,
  listUserTenants,
  userIsMemberOfCurrentTenant,
} from "@/lib/db";
import { signOutAction } from "./actions";
import { ensureCurrentProjectCookie } from "@/lib/current-project";
import { ResponsiveSidebar } from "./ResponsiveSidebar";
import { MobileTopBar } from "./MobileTopBar";
import { SidebarNav, type SidebarNavGroup, type SidebarNavItem } from "@/components/SidebarNav";
/** Each group is rendered with the same heading toggle + sub-links (`NavGroupSection` in `SidebarNav`). */
function sidebarNavGroups(onboardingComplete: boolean): SidebarNavGroup[] {
  const workspaceItems: SidebarNavItem[] = [];
  if (!onboardingComplete) {
    workspaceItems.push({ href: "/app/onboarding", label: "Setup wizard" });
  }
  workspaceItems.push(
    { href: "/app/integrations", label: "Integrations" },
    { href: "/app/recipients", label: "Email recipients" },
    { href: "/app/skills", label: "Skills" },
    { href: "/app/settings", label: "Settings" },
    { href: "/app/projects", label: "Projects" },
  );

  return [
    {
      /*
       * Learn — all the "understand your customers" pages.
       * Dashboard lives here as the starting point before a mode is chosen.
       */
      label: "Learn",
      items: [
        { href: "/app", label: "Dashboard" },
        { href: "/app/learn/feedback", label: "Feedback" },
        { href: "/app/learn/insights", label: "Insights" },
        { href: "/app/reporting", label: "Reporting" },
        { href: "/app/strategy", label: "Strategy" },
        { href: "/app/pulse-reports", label: "Pulse reports" },
      ],
    },
    {
      /*
       * Discover — sub-links auto-expand on any /app/discover/... page (see `NavGroupSection`).
       */
      label: "Discover",
      items: [
        { href: "/app/discover", label: "Overview" },
        { href: "/app/discover/map", label: "OST Map" },
        { href: "/app/discover/me", label: "My discovery" },
        { href: "/app/discover/board", label: "Board" },
        { href: "/app/discover/workspace", label: "Workspace" },
        { href: "/app/discover/insights", label: "Insights" },
      ],
    },
    {
      /* Build — turn insights into work. Specs Board comes once the table exists. */
      label: "Build",
      items: [
        { href: "/app/build/specs", label: "Specs" },
      ],
    },
    {
      /* Monitor — watch shipped work via LogRocket. More items added as Monitor grows. */
      label: "Monitor",
      items: [
        { href: "/app/monitor", label: "Features" },
      ],
    },
    {
      label: "Workspace",
      items: workspaceItems,
    },
  ];
}

function tenantAppUrl(slug: string, path = "/app"): string {
  const baseDomain = process.env.APP_BASE_DOMAIN ?? "xenoform.ai";
  // Local dev doesn't resolve subdomains — fall back to the `?tenant=` shortcut.
  if (process.env.NODE_ENV === "development" || baseDomain.startsWith("localhost")) {
    const proto = process.env.NEXTAUTH_URL?.split("://")[0] ?? "http";
    const separator = path.includes("?") ? "&" : "?";
    return `${proto}://${baseDomain}${path}${separator}tenant=${encodeURIComponent(slug)}`;
  }
  const proto = baseDomain.includes(":") ? "http" : "https";
  return `${proto}://${slug}.${baseDomain}${path}`;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const { db: authDb, usersTable } = getUserAuthDb();
  const [userRow] = await authDb
    .select({ onboardingCompletedAt: usersTable.onboardingCompletedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!userRow) {
    redirect("/api/auth/signout");
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  const isOnboardingPath = pathname.startsWith("/app/onboarding");
  const onboardingComplete = Boolean(userRow?.onboardingCompletedAt);

  // --- Multi-tenant routing: make sure the request is on the right subdomain ------
  if (isMultiTenant()) {
    const tenant = await resolveTenantForRequest();

    if (!tenant) {
      // On the bare apex domain (no x-tenant-slug).
      if (!onboardingComplete && isOnboardingPath) {
        // Onboarding runs on the apex: stay here until the user provisions a tenant.
      } else if (!onboardingComplete) {
        redirect("/app/onboarding");
      } else {
        // Onboarded users should be on their tenant subdomain — pick one.
        const memberships = await listUserTenants(userId);
        if (memberships.length === 0) {
          redirect("/app/onboarding");
        } else if (memberships.length === 1) {
          redirect(tenantAppUrl(memberships[0]!.slug));
        } else {
          // Multiple tenants — render a picker in-line.
          return <TenantPicker memberships={memberships} />;
        }
      }
    } else {
      // On a tenant subdomain — verify membership before letting any child query the tenant DB.
      const isMember = await userIsMemberOfCurrentTenant(userId);
      if (!isMember) {
        redirect("/app?tenant_denied=1");
      }
      if (!onboardingComplete && !isOnboardingPath) {
        redirect("/app/onboarding");
      }
    }
  } else {
    if (!onboardingComplete && !isOnboardingPath) {
      redirect("/app/onboarding");
    }
  }

  // Current-project cookie: only meaningful once onboarding is done and the request is
  // scoped to a tenant (or single-tenant mode).
  if (onboardingComplete && !isOnboardingPath) {
    if (isMultiTenant()) {
      const tenant = await resolveTenantForRequest();
      if (tenant) {
        const tenantDb = await getRequestDb();
        await ensureCurrentProjectCookie(userId, tenantDb);
      }
    } else {
      await ensureCurrentProjectCookie(userId);
    }
  }

  const bullBoardUrl = process.env.NEXT_PUBLIC_BULL_BOARD_URL;
  const isAdmin = session.user.role === 1;

  if (!onboardingComplete) {
    return (
      <div className="min-vh-100 bg-body-tertiary">
        <header className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom border-secondary-subtle bg-body">
          <div className="d-flex align-items-center gap-2">
            <span aria-hidden="true" className="xf-brand-mark" />
            <p
              className="small fw-semibold text-uppercase mb-0"
              style={{ color: "var(--xf-accent)", letterSpacing: "0.08em", fontSize: "0.7rem" }}
            >
              xenoform.ai
            </p>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="small text-body-secondary">{session.user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="btn btn-link btn-sm p-0 text-decoration-none">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 pb-4 pt-5 p-lg-5" style={{ maxWidth: "48rem", margin: "0 auto" }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="d-flex min-vh-100 app-layout-shell">
      <ResponsiveSidebar>
        <div className="d-flex align-items-center gap-2 pb-3 mb-3 border-bottom border-secondary-subtle">
          {/* Bio-mechanical accent plate — acts as the app logo mark */}
          <span aria-hidden="true" className="xf-brand-mark" />
          <p
            className="small fw-semibold text-uppercase mb-0"
            style={{ color: "var(--xf-accent)", letterSpacing: "0.08em", fontSize: "0.72rem" }}
          >
            xenoform.ai
          </p>
        </div>
        <SidebarNav groups={sidebarNavGroups(true)}>
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
      {/*
       * Right-hand column: the mode bar sits above the page content so it
       * spans the full content width on every page without each page needing
       * to include it themselves.
       */}
      <div className="d-flex flex-column flex-grow-1 min-w-0">
        <MobileTopBar />
        <main className="flex-grow-1 bg-body-tertiary px-4 pb-4 pt-3 p-lg-5 app-main-pane">
          {children}
        </main>
      </div>
    </div>
  );
}

function TenantPicker({ memberships }: { memberships: { id: number; slug: string; name: string }[] }) {
  return (
    <div className="min-vh-100 bg-body-tertiary d-flex align-items-center justify-content-center px-3">
      <div style={{ maxWidth: "26rem" }} className="w-100">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span aria-hidden="true" className="xf-brand-mark" />
          <p
            className="small fw-semibold text-uppercase mb-0"
            style={{ color: "var(--xf-accent)", letterSpacing: "0.08em", fontSize: "0.72rem" }}
          >
            xenoform.ai
          </p>
        </div>
        <h1 className="h4 mb-3">Pick a workspace</h1>
        <p className="small text-body-secondary mb-3">
          You belong to more than one workspace. Choose one to continue.
        </p>
        <div className="list-group shadow-sm border-secondary-subtle">
          {memberships.map((m) => (
            <a key={m.id} href={tenantAppUrl(m.slug)} className="list-group-item list-group-item-action">
              <span className="fw-medium text-body">{m.name}</span>
              <span className="text-body-secondary small"> · {m.slug}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
