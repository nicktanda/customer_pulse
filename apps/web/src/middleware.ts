import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Forwards the pathname so server layouts can branch (e.g. skip project-cookie redirect on `/app/onboarding`).
 * Auth is still enforced inside `app/app/layout.tsx` with `auth()`.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/app/:path*"],
};
