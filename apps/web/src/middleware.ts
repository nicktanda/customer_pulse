import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: forwards `x-pathname` for layout branching and parses subdomain
 * for multi-tenant routing.
 *
 * Auth is still enforced inside `app/app/layout.tsx` with `auth()`.
 */

/**
 * Legacy-path redirects — 301 Permanent.
 *
 * Pages that lived at /app/<resource> have moved to /app/learn/<resource>.
 * These redirects keep old bookmarks and external links working, and must be
 * registered before any page component is touched so nothing breaks during the
 * refactor (see design principle: "Redirects before refactors").
 */
const LEARN_REDIRECTS: [prefix: string, newPrefix: string][] = [
  ["/app/insights", "/app/learn/insights"],
  ["/app/feedback", "/app/learn/feedback"],
  ["/app/themes", "/app/learn/themes"],
  ["/app/ideas", "/app/learn/ideas"],
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for a learn-area redirect before doing anything else.
  for (const [oldPrefix, newPrefix] of LEARN_REDIRECTS) {
    if (pathname === oldPrefix || pathname.startsWith(`${oldPrefix}/`) || pathname.startsWith(`${oldPrefix}?`)) {
      const newUrl = request.nextUrl.clone();
      // Replace only the matched prefix so query strings and sub-paths are preserved.
      newUrl.pathname = newPrefix + pathname.slice(oldPrefix.length);
      return NextResponse.redirect(newUrl, { status: 301 });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // --- Multi-tenant subdomain extraction ---
  if (process.env.MULTI_TENANT === "true") {
    const host = request.headers.get("host") ?? "";
    const baseDomain = process.env.APP_BASE_DOMAIN ?? "customerpulse.app";

    if (host.endsWith(`.${baseDomain}`)) {
      const subdomain = host.replace(`.${baseDomain}`, "");
      if (subdomain && subdomain !== "www" && subdomain !== "app") {
        requestHeaders.set("x-tenant-slug", subdomain);
      }
    }

    // Local dev: support ?tenant=slug query param
    if (process.env.NODE_ENV === "development") {
      const devTenant = request.nextUrl.searchParams.get("tenant");
      if (devTenant) {
        requestHeaders.set("x-tenant-slug", devTenant);
      }
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*", "/login", "/register"],
};
