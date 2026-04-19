import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userHasProjectAccess } from "@/lib/project-access";
import { CURRENT_PROJECT_COOKIE, safeReturnPathAfterSetProject } from "@/lib/current-project";

export const runtime = "nodejs";

/**
 * Sets the httpOnly current-project cookie and redirects back into the app.
 * Query: `id` = project id (must be a project the signed-in user belongs to).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const userId = Number(session.user.id);
  const idParam = new URL(request.url).searchParams.get("id");
  const projectId = idParam ? Number.parseInt(idParam, 10) : NaN;
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const ok = await userHasProjectAccess(userId, projectId);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nextParam = new URL(request.url).searchParams.get("next");
  const destination = safeReturnPathAfterSetProject(nextParam);
  const res = NextResponse.redirect(new URL(destination, request.url));
  res.cookies.set(CURRENT_PROJECT_COOKIE, String(projectId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}
