import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class LogRocketClient extends BaseIntegrationClient {
  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.str("api_token")}` };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("api_token") || !this.str("app_id")) return { success: false, message: "API token and app ID are required" };
    try {
      const res = await fetch(`https://api.logrocket.com/v1/orgs/${this.str("org_id")}/apps/${this.str("app_id")}/`, { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to LogRocket" };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const orgId = this.str("org_id");
    const appId = this.str("app_id");
    if (!orgId || !appId) return [];

    const res = await fetch(`https://api.logrocket.com/v1/orgs/${orgId}/apps/${appId}/events?limit=50`, { headers: this.headers });
    if (!res.ok) throw new Error(`LogRocket API: HTTP ${res.status}`);

    const json = (await res.json()) as { events?: LogRocketEvent[] };
    const events = json.events ?? [];

    return events.map((ev) => ({
      title: ev.type ?? "LogRocket event",
      content: ev.message ?? ev.type ?? "",
      authorEmail: ev.userEmail ?? undefined,
      sourceExternalId: ev.id ?? `lr-${ev.sessionId}-${ev.timestamp}`,
      rawData: ev as unknown as Record<string, unknown>,
    }));
  }
}

interface LogRocketEvent {
  id?: string;
  sessionId?: string;
  type?: string;
  message?: string;
  userEmail?: string;
  timestamp?: string;
}
