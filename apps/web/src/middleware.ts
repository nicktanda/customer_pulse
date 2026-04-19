import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: forwards `x-pathname` for layout branching and parses subdomain
 * for multi-tenant routing.
 *
 * Auth is still enforced inside `app/app/layout.tsx` with `auth()`.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // --- Multi-tenant subdomain extraction ---
  if (process.env.MULTI_TENANT === "true") {
    const host = request.headers.get("host") ?? "";
    const baseDomain = process.env.APP_BASE_DOMAIN ?? "kairos.ai";

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
