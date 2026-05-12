import { NextRequest, NextResponse } from "next/server";
import { isValidHex } from "../../../../lib/accentColor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accentColor } = body ?? {};

    if (!accentColor || !isValidHex(accentColor)) {
      return NextResponse.json(
        { message: "Invalid hex colour value" },
        { status: 400 }
      );
    }

    // TODO: persist to the user's profile in the database.
    // For now we acknowledge the request so the client-side flow works end-to-end.
    return NextResponse.json({ ok: true, accentColor });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
