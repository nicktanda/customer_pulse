import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class IntercomClient extends BaseIntegrationClient {
  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.str("access_token")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("access_token")) return { success: false, message: "Access token is required" };
    try {
      const res = await fetch("https://api.intercom.io/me", { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { name?: string; app?: { name?: string } };
      return { success: true, message: `Connected to ${json.app?.name ?? json.name ?? "Intercom"}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const res = await fetch("https://api.intercom.io/conversations?order=updated_at&sort_order=desc&per_page=50", { headers: this.headers });
    if (!res.ok) throw new Error(`Intercom API: HTTP ${res.status}`);

    const json = (await res.json()) as { conversations?: IntercomConversation[] };
    const conversations = json.conversations ?? [];

    return conversations.map((c) => ({
      title: c.source?.subject ?? c.source?.body?.slice(0, 100) ?? "Intercom conversation",
      content: c.source?.body ?? c.source?.subject ?? "",
      authorName: c.source?.author?.name ?? undefined,
      authorEmail: c.source?.author?.email ?? undefined,
      sourceExternalId: c.id,
      rawData: c as unknown as Record<string, unknown>,
    }));
  }
}

interface IntercomConversation {
  id: string;
  source?: {
    subject?: string;
    body?: string;
    author?: { name?: string; email?: string };
  };
}
