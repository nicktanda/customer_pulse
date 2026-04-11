import { NextResponse } from "next/server";

/** Liveness probe for load balancers / Render health checks. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "customer-pulse-web" });
}
