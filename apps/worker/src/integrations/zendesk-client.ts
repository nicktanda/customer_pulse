import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class ZendeskClient extends BaseIntegrationClient {
  private get baseUrl(): string {
    const subdomain = this.str("subdomain");
    return `https://${subdomain}.zendesk.com`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`${this.str("email")}/token:${this.str("api_token")}`).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("subdomain") || !this.str("api_token")) return { success: false, message: "Subdomain, email, and API token are required" };
    try {
      const res = await fetch(`${this.baseUrl}/api/v2/users/me.json`, { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { user?: { name?: string } };
      return { success: true, message: `Connected as ${json.user?.name ?? "unknown"}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const res = await fetch(`${this.baseUrl}/api/v2/tickets.json?sort_by=updated_at&sort_order=desc&per_page=50`, { headers: this.headers });
    if (!res.ok) throw new Error(`Zendesk API: HTTP ${res.status}`);

    const json = (await res.json()) as { tickets?: ZendeskTicket[] };
    const tickets = json.tickets ?? [];

    const priorityMap: Record<string, number> = { urgent: 1, high: 2, normal: 3, low: 4 };
    return tickets.map((t) => ({
      title: t.subject ?? "Untitled ticket",
      content: t.description ?? t.subject ?? "",
      authorEmail: t.requester?.email ?? undefined,
      authorName: t.requester?.name ?? undefined,
      sourceExternalId: String(t.id),
      priority: priorityMap[(t.priority ?? "").toLowerCase()] ?? 0,
      rawData: t as unknown as Record<string, unknown>,
    }));
  }
}

interface ZendeskTicket {
  id: number;
  subject?: string;
  description?: string;
  priority?: string;
  requester?: { name?: string; email?: string };
}
