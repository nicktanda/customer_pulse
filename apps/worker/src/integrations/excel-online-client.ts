import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class ExcelOnlineClient extends BaseIntegrationClient {
  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.str("access_token")}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    if (!this.str("access_token") || !this.str("workbook_id")) {
      return { success: false, message: "Access token and workbook ID are required" };
    }
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${this.str("workbook_id")}/workbook/worksheets`, { headers: this.headers });
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      return { success: true, message: "Connected to Excel workbook" };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const workbookId = this.str("workbook_id");
    const worksheet = this.str("worksheet_name") || "Sheet1";
    const range = this.str("range") || "A1:Z500";

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${workbookId}/workbook/worksheets('${worksheet}')/range(address='${range}')`, { headers: this.headers });
    if (!res.ok) throw new Error(`Excel Online API: HTTP ${res.status}`);

    const json = (await res.json()) as { values?: (string | null)[][] };
    const rows = json.values ?? [];
    if (rows.length <= 1) return [];

    const titleIdx = Number(this.str("title_column_index") || "1");
    const contentIdx = Number(this.str("content_column_index") || "2");

    const items: FeedbackItem[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const content = row[contentIdx] ?? "";
      if (!content.trim()) continue;

      items.push({
        title: row[titleIdx] ?? content.slice(0, 100),
        content,
        sourceExternalId: `excel-${workbookId}-${worksheet}-row${i}`,
        rawData: { row: i, values: row },
      });
    }

    return items;
  }
}
