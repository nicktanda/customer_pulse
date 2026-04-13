import { BaseIntegrationClient, type FeedbackItem, type TestConnectionResult } from "./base-client.js";

export class GoogleFormsClient extends BaseIntegrationClient {
  async testConnection(): Promise<TestConnectionResult> {
    const apiKey = this.str("api_key");
    const spreadsheetId = this.str("spreadsheet_id");
    if (!apiKey || !spreadsheetId) return { success: false, message: "API key and spreadsheet ID are required" };

    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=properties.title`);
      if (!res.ok) return { success: false, message: `HTTP ${res.status}` };
      const json = (await res.json()) as { properties?: { title?: string } };
      return { success: true, message: `Connected to "${json.properties?.title ?? "spreadsheet"}"` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
    }
  }

  async fetchItems(): Promise<FeedbackItem[]> {
    const apiKey = this.str("api_key");
    const spreadsheetId = this.str("spreadsheet_id");
    const sheetName = this.str("sheet_name") || "Sheet1";
    const titleCol = this.str("title_column") || "B";
    const contentCol = this.str("content_column") || "C";
    const emailCol = this.str("email_column") || "D";

    if (!apiKey || !spreadsheetId) return [];

    const range = `${sheetName}!A:Z`;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`);
    if (!res.ok) throw new Error(`Google Sheets API: HTTP ${res.status}`);

    const json = (await res.json()) as { values?: string[][] };
    const rows = json.values ?? [];
    if (rows.length <= 1) return []; // header only

    const colIndex = (col: string): number => col.toUpperCase().charCodeAt(0) - 65;
    const titleIdx = colIndex(titleCol);
    const contentIdx = colIndex(contentCol);
    const emailIdx = colIndex(emailCol);

    const items: FeedbackItem[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const content = row[contentIdx] ?? "";
      if (!content.trim()) continue;

      items.push({
        title: row[titleIdx] ?? content.slice(0, 100),
        content,
        authorEmail: row[emailIdx] ?? undefined,
        sourceExternalId: `gf-${spreadsheetId}-row${i}`,
        rawData: { row: i, values: row },
      });
    }

    return items;
  }
}
