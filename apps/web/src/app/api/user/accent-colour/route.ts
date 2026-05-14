import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCENT_COLOURS, ACCENT_COLOUR_STORAGE_KEY } from "@/components/accent-colour/accent-colours";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * GET /api/user/accent-colour
 * Returns the currently persisted accent colour id.
 */
export async function GET() {
  const cookieStore = await cookies();
  const stored = cookieStore.get(ACCENT_COLOUR_STORAGE_KEY)?.value ?? "blue";
  const valid = ACCENT_COLOURS.find((c) => c.id === stored) ? stored : "blue";
  return NextResponse.json({ colourId: valid });
}

/**
 * POST /api/user/accent-colour
 * Body: { colourId: string }
 * Persists the accent colour via an HTTP cookie.
 * In a full auth-backed implementation this would also write to the DB.
 *
 * The cookie is NOT httpOnly so the client can read it during hydration
 * to avoid a flash of the default colour. Since it holds only a colour
 * preference (no sensitive data), this is an acceptable trade-off.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const colourId = (body as { colourId?: unknown }).colourId;
  if (typeof colourId !== "string") {
    return NextResponse.json({ error: "colourId must be a string" }, { status: 400 });
  }

  const valid = ACCENT_COLOURS.find((c) => c.id === colourId);
  if (!valid) {
    return NextResponse.json(
      { error: `Unknown colourId. Valid values: ${ACCENT_COLOURS.map((c) => c.id).join(", ")}` },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCENT_COLOUR_STORAGE_KEY, colourId, {
    httpOnly: false, // readable client-side for hydration (holds no sensitive data)
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ colourId });
}
