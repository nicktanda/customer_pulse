import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { integrations } from "@customer-pulse/db/client";
import { userHasProjectAccess } from "@/lib/project-access";
import { decryptCredentialsColumn } from "@customer-pulse/db/lockbox";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const integrationId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(integrationId)) {
    return NextResponse.json({ error: "Invalid integration ID" }, { status: 400 });
  }

  const db = await getRequestDb();
  const [integration] = await db.select().from(integrations).where(eq(integrations.id, integrationId)).limit(1);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (!(await userHasProjectAccess(Number(session.user.id), integration.projectId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Dynamically import the client registry from worker
  // For the web app, we inline the test connection logic rather than importing the full worker
  const masterKey = process.env.LOCKBOX_MASTER_KEY ?? "";
  let credentials: Record<string, unknown> = {};
  try {
    const decrypted = decryptCredentialsColumn(integration.credentialsCiphertext, masterKey);
    credentials = decrypted ? (JSON.parse(decrypted) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ success: false, message: "Failed to decrypt credentials" });
  }

  // Simple connectivity tests based on source type
  const sourceType = integration.sourceType;
  try {
    const result = await testIntegrationConnection(sourceType, credentials);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : "Test failed" });
  }
}

async function testIntegrationConnection(
  sourceType: number,
  credentials: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  const str = (key: string) => String(credentials[key] ?? "");

  switch (sourceType) {
    case 0: { // Linear
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: str("api_key") },
        body: JSON.stringify({ query: "{ viewer { id name } }" }),
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to Linear" };
    }
    case 2: { // Slack
      const res = await fetch("https://slack.com/api/auth.test", {
        headers: { Authorization: `Bearer ${str("bot_token")}` },
      });
      const json = (await res.json()) as { ok: boolean; team?: string; error?: string };
      if (!json.ok) return { success: false, message: json.error ?? "Auth test failed" };
      return { success: true, message: `Connected to ${json.team ?? "Slack"}` };
    }
    case 6: { // Jira
      const baseUrl = str("base_url").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${Buffer.from(`${str("email")}:${str("api_token")}`).toString("base64")}` },
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to Jira" };
    }
    case 13: { // Anthropic
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": str("api_key"), "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }),
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Anthropic API key is valid" };
    }
    default:
      return { success: true, message: "Connection test not implemented for this integration type — credentials saved" };
  }
}
