/**
 * API Route: /api/user/accent-color
 *
 * Provides a thin server-side persistence layer for the accent colour
 * preference so it survives across devices/browsers.  The initial
 * implementation stores the value in a cookie; future work should
 * persist it to the user record in the database.
 *
 * NOTE: These endpoints have no auth guard in the initial implementation
 * because they only write a client-side cookie preference.  If/when this
 * route is extended to write to the DB, an auth check MUST be added first.
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidHex } from "@/lib/accent-color";

const COOKIE_NAME = "accent-color";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME);
  const raw = cookie?.value ?? null;

  // Validate the stored cookie value before echoing it back to the client.
  const value = raw && isValidHex(raw) ? raw : null;

  return NextResponse.json({ accentColor: value });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Guard against non-object bodies (null, string, array, etc.)
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { accentColor } = body as { accentColor?: string };

  if (!accentColor || !isValidHex(accentColor)) {
    return NextResponse.json(
      { error: "accentColor must be a valid 6-digit hex string (e.g. #2563EB)" },
      { status: 422 }
    );
  }

  const response = NextResponse.json({ accentColor });
  response.cookies.set(COOKIE_NAME, accentColor, {
    httpOnly: false, // readable client-side for hydration
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
  });

  return response;
}

export async function DELETE(_req: NextRequest) {
  const response = NextResponse.json({ accentColor: null });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
