import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class LinearClient extends BaseIntegrationClient {
  async testConnection(): Promise<TestConnectionResult> {
    const apiKey = this.str("api_key");
    if (!apiKey) return { success: false, message: "API key is required" };

    try {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey },
        body: JSON.stringify({ query: "{ viewer { id name } }" }),
      });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { data?: { viewer?: { name?: string } } };
      return { success: true, message: `Connected as ${json.data?.viewer?.name ?? "unknown"}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const apiKey = this.str("api_key");
    if (!apiKey) return [];

    const teamId = this.str("team_id");
    const filter = teamId ? `filter: { team: { id: { eq: "${teamId}" } } }` : "";

    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({
        query: `{
          issues(first: 50, orderBy: updatedAt, ${filter}) {
            nodes {
              id identifier title description priority
              creator { name email }
              labels { nodes { name } }
              updatedAt
            }
          }
        }`,
      }),
    });

    if (!res.ok) throw new Error(`Linear API: HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { issues?: { nodes?: LinearIssue[] } } };
    const issues = json.data?.issues?.nodes ?? [];

    const priorityMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4 }; // Linear 1=urgent → our p1
    const items: FeedbackItem[] = [];

    for (const issue of issues) {
      const labels = (issue.labels?.nodes ?? []).map((l) => l.name?.toLowerCase() ?? "");
      let category = 0;
      if (labels.some((l) => l.includes("bug"))) category = 1;
      else if (labels.some((l) => l.includes("feature"))) category = 2;

      items.push({
        title: `${issue.identifier}: ${issue.title}`,
        content: issue.description ?? issue.title ?? "",
        authorName: issue.creator?.name ?? undefined,
        authorEmail: issue.creator?.email ?? undefined,
        sourceExternalId: issue.id,
        category,
        priority: priorityMap[issue.priority ?? 0] ?? 0,
        rawData: issue as unknown as Record<string, unknown>,
      });
    }

    return items;
  }
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority?: number;
  creator?: { name?: string; email?: string };
  labels?: { nodes?: { name?: string }[] };
  updatedAt?: string;
}
