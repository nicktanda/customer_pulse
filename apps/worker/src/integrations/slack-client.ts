import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class SlackClient extends BaseIntegrationClient {
  async testConnection(): Promise<TestConnectionResult> {
    const token = this.str("bot_token");
    if (!token) return { success: false, message: "Bot token is required" };

    try {
      const res = await fetch("https://slack.com/api/auth.test", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { ok: boolean; error?: string; team?: string };
      if (!json.ok) return { success: false, message: json.error ?? "Auth test failed" };
      return { success: true, message: `Connected to ${json.team ?? "workspace"}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const token = this.str("bot_token");
    const channel = this.str("channel_id") || this.str("channels");
    console.log(`[slack-sync] creds keys=${Object.keys(this.credentials).join(",")} token=${token ? "set" : "MISSING"} channel=${channel || "MISSING"} raw_channels=${this.str("channels")}`);
    if (!token || !channel) return [];

    const keywords = (this.str("keywords") || "feedback,bug,issue,feature,request,problem").split(",").map((k) => k.trim().toLowerCase());
    const oldest = String(Math.floor((Date.now() - 60 * 60 * 1000) / 1000)); // last hour

    const res = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&oldest=${oldest}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = (await res.json()) as { ok: boolean; messages?: SlackMessage[]; error?: string };
    console.log(`[slack-sync] channel=${channel} ok=${json.ok} error=${json.error ?? "none"} messages=${json.messages?.length ?? 0}`);
    if (!json.ok || !json.messages) return [];

    const items: FeedbackItem[] = [];
    for (const msg of json.messages) {
      if (!msg.text) continue;
      const lower = msg.text.toLowerCase();
      if (!keywords.some((kw) => lower.includes(kw))) continue;

      items.push({
        title: msg.text.slice(0, 200),
        content: msg.text,
        authorName: msg.user ?? undefined,
        sourceExternalId: `${channel}-${msg.ts}`,
        rawData: msg as unknown as Record<string, unknown>,
      });
    }

    return items;
  }
}

interface SlackMessage {
  type?: string;
  user?: string;
  text?: string;
  ts?: string;
}
