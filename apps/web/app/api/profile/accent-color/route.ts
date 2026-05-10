/**
 * API route: /api/profile/accent-color
 *
 * GET  – Return the authenticated user's stored accent colour.
 * PUT  – Persist a new accent colour for the authenticated user.
 *
 * NOTE: Replace the placeholder auth / persistence calls with your actual
 * session and database utilities (e.g. getServerSession + Prisma/Drizzle).
 *
 * ⚠️  WARNING: This route MUST NOT be deployed to production until
 * `getCurrentUserId` is wired to a real session provider. The current
 * placeholder returns "demo-user" for every request, meaning all users
 * share a single preference slot.
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidHexColor, DEFAULT_ACCENT_COLOR } from "../../../../lib/accentColor";
import { isAccentColorEnabled } from "../../../../lib/featureFlags";

// ---------------------------------------------------------------------------
// CSRF helpers
// ---------------------------------------------------------------------------

/**
 * Rudimentary origin / referer check for mutating requests.
 * For full protection, pair with a SameSite=Strict session cookie or a
 * dedicated CSRF token header.
 */
function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    // Allow requests with no Origin header (e.g. server-to-server), but
    // reject ones that explicitly declare a cross-origin origin.
    return !origin;
  }
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Placeholder – replace with your real auth + DB helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(_req: NextRequest): Promise<string | null> {
  // TODO: integrate with your session provider, e.g.
  // const session = await getServerSession(authOptions);
  // return session?.user?.id ?? null;
  //
  // ⚠️  PLACEHOLDER ONLY – returns a hardcoded ID. Do not ship to production.
  if (process.env.NODE_ENV === "production") {
    // Fail closed in production until real auth is wired up.
    return null;
  }
  return "demo-user";
}

const mockStore: Record<string, string> = {};

async function getUserAccentColor(userId: string): Promise<string | null> {
  // TODO: replace with a real DB query, e.g.
  // const pref = await db.userPreference.findUnique({ where: { userId } });
  // return pref?.accentColor ?? null;
  return mockStore[userId] ?? null;
}

async function setUserAccentColor(userId: string, color: string): Promise<void> {
  // TODO: replace with a real DB upsert, e.g.
  // await db.userPreference.upsert({
  //   where: { userId },
  //   create: { userId, accentColor: color },
  //   update: { accentColor: color },
  // });
  mockStore[userId] = color;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!isAccentColorEnabled()) {
    return NextResponse.json({ error: "Feature not enabled" }, { status: 404 });
  }

  const userId = await getCurrentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const stored = await getUserAccentColor(userId);
  return NextResponse.json({
    accentColor: stored ?? DEFAULT_ACCENT_COLOR,
  });
}

export async function PUT(req: NextRequest) {
  if (!isAccentColorEnabled()) {
    return NextResponse.json({ error: "Feature not enabled" }, { status: 404 });
  }

  // CSRF guard – reject cross-origin mutation requests
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = await getCurrentUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const accentColor = (body as Record<string, unknown>)?.accentColor;
  if (typeof accentColor !== "string" || !isValidHexColor(accentColor)) {
    return NextResponse.json(
      { error: "accentColor must be a valid hex colour string (e.g. #6366f1)" },
      { status: 422 }
    );
  }

  // Store and return the canonical (lowercased) form
  const canonical = accentColor.toLowerCase();
  await setUserAccentColor(userId, canonical);

  return NextResponse.json({ accentColor: canonical });
}
