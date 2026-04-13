import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class JiraClient extends BaseIntegrationClient {
  private get baseUrl(): string {
    return this.str("base_url").replace(/\/$/, "");
  }

  private get headers(): Record<string, string> {
    const email = this.str("email");
    const token = this.str("api_token");
    return {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.baseUrl || !this.str("api_token")) {
      return { success: false, message: "Base URL, email, and API token are required" };
    }
    try {
      const res = await fetch(`${this.baseUrl}/rest/api/3/myself`, { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { displayName?: string };
      return { success: true, message: `Connected as ${json.displayName ?? "unknown"}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const project = this.str("project_key");
    const jql = project ? `project = "${project}" ORDER BY updated DESC` : "ORDER BY updated DESC";

    const res = await fetch(`${this.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,description,priority,issuetype,labels,reporter`, {
      headers: this.headers,
    });

    if (!res.ok) throw new Error(`Jira API: HTTP ${res.status}`);
    const json = (await res.json()) as { issues?: JiraIssue[] };
    const issues = json.issues ?? [];

    const priorityMap: Record<string, number> = { highest: 1, high: 2, medium: 3, low: 4, lowest: 4 };
    const items: FeedbackItem[] = [];

    for (const issue of issues) {
      const fields = issue.fields ?? {};
      const priName = (fields.priority?.name ?? "").toLowerCase();

      let category = 0;
      const type = (fields.issuetype?.name ?? "").toLowerCase();
      const labels = (fields.labels ?? []).map((l: string) => l.toLowerCase());
      if (type.includes("bug") || labels.includes("bug")) category = 1;
      else if (type.includes("feature") || type.includes("story") || labels.includes("feature")) category = 2;

      const desc = typeof fields.description === "string" ? fields.description : JSON.stringify(fields.description ?? "");

      items.push({
        title: `${issue.key}: ${fields.summary ?? ""}`,
        content: desc || fields.summary || "",
        authorName: fields.reporter?.displayName ?? undefined,
        authorEmail: fields.reporter?.emailAddress ?? undefined,
        sourceExternalId: issue.id ?? issue.key,
        category,
        priority: priorityMap[priName] ?? 0,
        rawData: issue as unknown as Record<string, unknown>,
      });
    }

    return items;
  }
}

interface JiraIssue {
  id?: string;
  key: string;
  fields?: {
    summary?: string;
    description?: unknown;
    priority?: { name?: string };
    issuetype?: { name?: string };
    labels?: string[];
    reporter?: { displayName?: string; emailAddress?: string };
  };
}
