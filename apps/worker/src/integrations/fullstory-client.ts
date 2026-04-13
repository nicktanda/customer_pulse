import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class FullStoryClient extends BaseIntegrationClient {
  private get headers(): Record<string, string> {
    return { Authorization: `Basic ${this.str("api_key")}` };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("api_key")) return { success: false, message: "API key is required" };
    try {
      const res = await fetch("https://api.fullstory.com/v2/sessions?limit=1", { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to FullStory" };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const res = await fetch("https://api.fullstory.com/v2/sessions?limit=50", { headers: this.headers });
    if (!res.ok) throw new Error(`FullStory API: HTTP ${res.status}`);

    const json = (await res.json()) as { sessions?: FullStorySession[] };
    const sessions = json.sessions ?? [];

    return sessions
      .filter((s) => s.notes || s.tags?.length)
      .map((s) => ({
        title: s.notes?.slice(0, 200) ?? `Session ${s.id}`,
        content: s.notes ?? s.tags?.join(", ") ?? "",
        authorEmail: s.userEmail ?? undefined,
        sourceExternalId: s.id,
        rawData: s as unknown as Record<string, unknown>,
      }));
  }
}

interface FullStorySession {
  id: string;
  notes?: string;
  tags?: string[];
  userEmail?: string;
}
