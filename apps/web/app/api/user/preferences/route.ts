import { NextRequest, NextResponse } from "next/server";

/**
 * User preferences API route.
 *
 * GET  /api/user/preferences  – Return the current user's preferences.
 * PATCH /api/user/preferences – Update one or more preference fields.
 *
 * NOTE: Replace the stub persistence layer below with your actual
 * database / session logic (e.g. Prisma, Drizzle, etc.).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserPreferences {
  accentColor?: string;
}

// ---------------------------------------------------------------------------
// Stub persistence helpers (replace with real DB calls)
// ---------------------------------------------------------------------------

/**
 * Retrieve preferences for the currently authenticated user.
 * Returns null when the user is not authenticated.
 */
async function getPreferences(
  _req: NextRequest
): Promise<UserPreferences | null> {
  // TODO: extract session/auth, look up preferences in DB.
  // Returning empty object as default so the API doesn't error in the stub.
  return {};
}

/**
 * Persist partial preference updates for the current user.
 */
async function updatePreferences(
  _req: NextRequest,
  _patch: Partial<UserPreferences>
): Promise<UserPreferences> {
  // TODO: extract session/auth, merge patch into DB row, return updated record.
  return _patch as UserPreferences;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function validatePatch(
  body: unknown
): { ok: true; data: Partial<UserPreferences> } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const patch: Partial<UserPreferences> = {};
  const raw = body as Record<string, unknown>;

  if ("accentColor" in raw) {
    if (typeof raw.accentColor !== "string" || !HEX_RE.test(raw.accentColor)) {
      return {
        ok: false,
        error: "accentColor must be a 6-digit hex string (e.g. #4F46E5).",
      };
    }
    patch.accentColor = raw.accentColor;
  }

  return { ok: true, data: patch };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const prefs = await getPreferences(req);
  if (prefs === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validation = validatePatch(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const updated = await updatePreferences(req, validation.data);
  return NextResponse.json(updated);
}
