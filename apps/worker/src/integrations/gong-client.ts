import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class GongClient extends BaseIntegrationClient {
  private get headers(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(`${this.str("access_key")}:${this.str("access_key_secret")}`).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("access_key")) return { success: false, message: "Access key and secret are required" };
    try {
      const res = await fetch("https://api.gong.io/v2/users", { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to Gong" };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const fromDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // last 30 min
    const res = await fetch("https://api.gong.io/v2/calls", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ filter: { fromDateTime: fromDate }, cursor: null }),
    });

    if (!res.ok) throw new Error(`Gong API: HTTP ${res.status}`);
    const json = (await res.json()) as { calls?: GongCall[] };
    const calls = json.calls ?? [];

    return calls.map((call) => ({
      title: call.title ?? "Gong call",
      content: call.purpose ?? call.title ?? "",
      authorName: call.primaryUserId ?? undefined,
      sourceExternalId: call.id,
      rawData: call as unknown as Record<string, unknown>,
    }));
  }
}

interface GongCall {
  id: string;
  title?: string;
  purpose?: string;
  primaryUserId?: string;
}
