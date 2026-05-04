interface PulseReportData {
  periodStart: Date;
  periodEnd: Date;
  feedbackCount: number;
  summary: string;
  highPriorityItems: { title: string; category: string; priority: string }[];
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  recentInsights: { title: string; severity: string }[];
  quickWins: { title: string; effort: string; impact: string }[];
  highImpactIdeas: { title: string; effort: string; impact: string }[];
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function breakdownRows(data: Record<string, number>): string {
  return Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([label, count]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#8fa99a">${label}</td><td style="padding:4px 0;font-weight:600;color:#e8f5ee">${count}</td></tr>`,
    )
    .join("");
}

export function renderPulseReportHtml(data: PulseReportData): string {
  const dateRange = `${formatDate(data.periodStart)} \u2013 ${formatDate(data.periodEnd)}`;

  const highPriItems = data.highPriorityItems.length > 0
    ? data.highPriorityItems
        .slice(0, 10)
        .map((f) => `<li style="margin-bottom:6px"><strong style="color:#39ff88">${f.priority.toUpperCase()}</strong> <span style="color:#8fa99a">[${f.category}]</span> ${f.title}</li>`)
        .join("")
    : `<li style="color:#8fa99a">None in this period</li>`;

  const insightItems = data.recentInsights.length > 0
    ? data.recentInsights
        .slice(0, 5)
        .map((i) => `<li style="margin-bottom:6px"><strong style="color:#39ff88">${i.severity}</strong>: ${i.title}</li>`)
        .join("")
    : "";

  const quickWinItems = data.quickWins.length > 0
    ? data.quickWins
        .slice(0, 3)
        .map((i) => `<li style="margin-bottom:6px">${i.title} <span style="color:#5f776b">(${i.effort} effort, ${i.impact} impact)</span></li>`)
        .join("")
    : "";

  const highImpactItems = data.highImpactIdeas.length > 0
    ? data.highImpactIdeas
        .slice(0, 3)
        .map((i) => `<li style="margin-bottom:6px">${i.title} <span style="color:#5f776b">(${i.effort} effort, ${i.impact} impact)</span></li>`)
        .join("")
    : "";

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#020403;color:#e8f5ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#07110c;border-radius:10px;padding:32px;border:1px solid rgba(90,255,150,0.22)">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 4px">
        <tr>
          <td style="padding-right:10px;vertical-align:middle">
            <div style="width:18px;height:18px;border-radius:6px 2px 6px 2px;background:#39ff88;box-shadow:0 0 8px rgba(57,255,136,0.45)"></div>
          </td>
          <td style="vertical-align:middle">
            <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#39ff88;font-weight:700">xenoform.ai</span>
          </td>
        </tr>
      </table>
      <h1 style="margin:14px 0 4px;font-size:22px;color:#e8f5ee;font-weight:600">Pulse digest</h1>
      <p style="margin:0 0 24px;color:#8fa99a;font-size:14px">${dateRange} &bull; ${data.feedbackCount} feedback items</p>

      ${data.summary ? `<div style="background:#0b1a12;border-left:2px solid #39ff88;border-radius:4px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;color:#e8f5ee;line-height:1.6">${data.summary}</p>
      </div>` : ""}

      <h2 style="font-size:13px;color:#39ff88;margin:0 0 12px;border-bottom:1px solid rgba(90,255,150,0.18);padding-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">High priority feedback</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#e8f5ee;line-height:1.5">${highPriItems}</ul>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:24px">
        <tr>
          ${Object.keys(data.categoryBreakdown).length > 0 ? `<td valign="top" style="padding-right:18px">
            <h3 style="font-size:11px;color:#8fa99a;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">By category</h3>
            <table style="font-size:14px;color:#e8f5ee">${breakdownRows(data.categoryBreakdown)}</table>
          </td>` : ""}
          ${Object.keys(data.priorityBreakdown).length > 0 ? `<td valign="top" style="padding-right:18px">
            <h3 style="font-size:11px;color:#8fa99a;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">By priority</h3>
            <table style="font-size:14px;color:#e8f5ee">${breakdownRows(data.priorityBreakdown)}</table>
          </td>` : ""}
          ${Object.keys(data.sourceBreakdown).length > 0 ? `<td valign="top">
            <h3 style="font-size:11px;color:#8fa99a;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">By source</h3>
            <table style="font-size:14px;color:#e8f5ee">${breakdownRows(data.sourceBreakdown)}</table>
          </td>` : ""}
        </tr>
      </table>

      ${insightItems ? `<h2 style="font-size:13px;color:#39ff88;margin:0 0 12px;border-bottom:1px solid rgba(90,255,150,0.18);padding-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Recent insights</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#e8f5ee;line-height:1.5">${insightItems}</ul>` : ""}

      ${quickWinItems ? `<h2 style="font-size:13px;color:#39ff88;margin:0 0 12px;border-bottom:1px solid rgba(90,255,150,0.18);padding-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Quick wins</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#e8f5ee;line-height:1.5">${quickWinItems}</ul>` : ""}

      ${highImpactItems ? `<h2 style="font-size:13px;color:#39ff88;margin:0 0 12px;border-bottom:1px solid rgba(90,255,150,0.18);padding-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">High impact ideas</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#e8f5ee;line-height:1.5">${highImpactItems}</ul>` : ""}

      <p style="margin:24px 0 0;font-size:12px;color:#5f776b;text-align:center">
        Sent by xenoform.ai &bull; <a href="${appUrl}/app/pulse-reports" style="color:#39ff88;text-decoration:none">View in app</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderPulseReportText(data: PulseReportData): string {
  const dateRange = `${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`;
  const lines: string[] = [
    `xenoform.ai pulse digest - ${dateRange}`,
    `${data.feedbackCount} feedback items`,
    "",
  ];

  if (data.summary) {
    lines.push(data.summary, "");
  }

  lines.push("HIGH PRIORITY FEEDBACK:");
  if (data.highPriorityItems.length > 0) {
    for (const f of data.highPriorityItems.slice(0, 10)) {
      lines.push(`  - ${f.priority.toUpperCase()} [${f.category}] ${f.title}`);
    }
  } else {
    lines.push("  None in this period");
  }
  lines.push("");

  if (data.recentInsights.length > 0) {
    lines.push("RECENT INSIGHTS:");
    for (const i of data.recentInsights.slice(0, 5)) {
      lines.push(`  - ${i.severity}: ${i.title}`);
    }
    lines.push("");
  }

  if (data.quickWins.length > 0) {
    lines.push("QUICK WINS:");
    for (const i of data.quickWins.slice(0, 3)) {
      lines.push(`  - ${i.title} (${i.effort} effort, ${i.impact} impact)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
