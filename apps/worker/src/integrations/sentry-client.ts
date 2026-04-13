import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class SentryClient extends BaseIntegrationClient {
  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.str("auth_token")}` };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("auth_token") || !this.str("organization")) return { success: false, message: "Auth token and organization are required" };
    try {
      const res = await fetch(`https://sentry.io/api/0/organizations/${this.str("organization")}/`, { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { name?: string };
      return { success: true, message: `Connected to ${json.name ?? "organization"}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const org = this.str("organization");
    const project = this.str("project");
    const url = project
      ? `https://sentry.io/api/0/projects/${org}/${project}/issues/?sort=date&limit=50`
      : `https://sentry.io/api/0/organizations/${org}/issues/?sort=date&limit=50`;

    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Sentry API: HTTP ${res.status}`);

    const issues = (await res.json()) as SentryIssue[];
    return issues.map((issue) => ({
      title: issue.title ?? "Sentry issue",
      content: `${issue.title}\n\n${issue.culprit ?? ""}\nEvents: ${issue.count ?? 0}, Users: ${issue.userCount ?? 0}\nLevel: ${issue.level ?? "unknown"}`,
      sourceExternalId: String(issue.id),
      category: 1, // bugs
      priority: issue.level === "fatal" ? 1 : issue.level === "error" ? 2 : 3,
      rawData: issue as unknown as Record<string, unknown>,
    }));
  }
}

interface SentryIssue {
  id: string;
  title?: string;
  culprit?: string;
  count?: number;
  userCount?: number;
  level?: string;
}
