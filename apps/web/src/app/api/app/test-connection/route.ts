import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * POST /api/app/integrations/test-credentials
 * Tests integration credentials without saving them — used during onboarding.
 * Body: { type: string, credentials: Record<string, unknown> }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; credentials?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, credentials } = body;
  if (!type || !credentials) {
    return NextResponse.json({ error: "type and credentials are required" }, { status: 422 });
  }

  const str = (key: string) => String(credentials[key] ?? "");

  try {
    const result = await testConnection(type, str);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : "Test failed" });
  }
}

async function testConnection(
  type: string,
  str: (key: string) => string,
): Promise<{ success: boolean; message: string }> {
  switch (type) {
    case "linear": {
      const apiKey = str("api_key");
      if (!apiKey) return { success: false, message: "API key is required" };
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey },
        body: JSON.stringify({ query: "{ viewer { id name } }" }),
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { data?: { viewer?: { name?: string } } };
      return { success: true, message: `Connected as ${json.data?.viewer?.name ?? "user"}` };
    }

    case "slack": {
      const token = str("bot_token");
      if (!token) return { success: false, message: "Bot token is required" };
      const res = await fetch("https://slack.com/api/auth.test", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { ok: boolean; team?: string; error?: string };
      if (!json.ok) return { success: false, message: json.error ?? "Auth test failed" };
      return { success: true, message: `Connected to ${json.team ?? "Slack"}` };
    }

    case "jira": {
      const baseUrl = str("site_url").replace(/\/$/, "");
      const email = str("email");
      const token = str("api_token");
      if (!baseUrl || !token) return { success: false, message: "Site URL, email, and API token are required" };
      const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}` },
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { displayName?: string };
      return { success: true, message: `Connected as ${json.displayName ?? "user"}` };
    }

    case "google_forms": {
      const apiKey = str("api_key");
      const spreadsheetId = str("spreadsheet_id");
      if (!apiKey || !spreadsheetId) return { success: false, message: "API key and spreadsheet ID are required" };
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=properties.title`);
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { properties?: { title?: string } };
      return { success: true, message: `Connected to "${json.properties?.title ?? "spreadsheet"}"` };
    }

    case "github": {
      const token = str("access_token");
      const owner = str("owner");
      const repo = str("repo");
      if (!token) return { success: false, message: "Access token is required" };
      const url = owner && repo ? `https://api.github.com/repos/${owner}/${repo}` : "https://api.github.com/user";
      const res = await fetch(url, { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { full_name?: string; login?: string };
      return { success: true, message: `Connected to ${json.full_name ?? json.login ?? "GitHub"}` };
    }

    case "gong": {
      const accessKey = str("access_key");
      const secret = str("access_key_secret");
      if (!accessKey || !secret) return { success: false, message: "Access key and secret are required" };
      const res = await fetch("https://api.gong.io/v2/users", {
        headers: { Authorization: `Basic ${Buffer.from(`${accessKey}:${secret}`).toString("base64")}` },
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to Gong" };
    }

    case "sentry": {
      const token = str("auth_token");
      const org = str("organization");
      if (!token || !org) return { success: false, message: "Auth token and organization are required" };
      const res = await fetch(`https://sentry.io/api/0/organizations/${org}/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { name?: string };
      return { success: true, message: `Connected to ${json.name ?? org}` };
    }

    case "zendesk": {
      const subdomain = str("subdomain");
      const email = str("email");
      const token = str("api_token");
      if (!subdomain || !token) return { success: false, message: "Subdomain, email, and API token are required" };
      const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
        headers: { Authorization: `Basic ${Buffer.from(`${email}/token:${token}`).toString("base64")}` },
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: `Connected to Zendesk` };
    }

    case "intercom": {
      const token = str("access_token");
      if (!token) return { success: false, message: "Access token is required" };
      const res = await fetch("https://api.intercom.io/me", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to Intercom" };
    }

    case "anthropic_api": {
      const apiKey = str("api_key");
      if (!apiKey) return { success: false, message: "API key is required" };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        return { success: false, message: errBody?.error?.message ?? `HTTP ${res.status}` };
      }
      return { success: true, message: "Anthropic API key is valid" };
    }

    default:
      return { success: false, message: `No test available for "${type}"` };
  }
}
