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
    .map(([label, count]) => `<tr><td style="padding:4px 12px 4px 0;color:#94a3b8">${label}</td><td style="padding:4px 0;font-weight:600;color:#f8fafc">${count}</td></tr>`)
    .join("");
}

export function renderPulseReportHtml(data: PulseReportData): string {
  const dateRange = `${formatDate(data.periodStart)} \u2013 ${formatDate(data.periodEnd)}`;

  const highPriItems = data.highPriorityItems.length > 0
    ? data.highPriorityItems
        .slice(0, 10)
        .map((f) => `<li style="margin-bottom:4px;color:#cbd5e1"><strong style="color:#22d3ee">${f.priority.toUpperCase()}</strong> [${f.category}] ${f.title}</li>`)
        .join("")
    : "<li>None in this period</li>";

  const insightItems = data.recentInsights.length > 0
    ? data.recentInsights
        .slice(0, 5)
        .map((i) => `<li style="margin-bottom:4px;color:#cbd5e1"><strong style="color:#22d3ee">${i.severity}</strong>: ${i.title}</li>`)
        .join("")
    : "";

  const quickWinItems = data.quickWins.length > 0
    ? data.quickWins
        .slice(0, 3)
        .map((i) => `<li style="margin-bottom:4px;color:#cbd5e1">${i.title} <span style="color:#64748b">(${i.effort} effort, ${i.impact} impact)</span></li>`)
        .join("")
    : "";

  const highImpactItems = data.highImpactIdeas.length > 0
    ? data.highImpactIdeas
        .slice(0, 3)
        .map((i) => `<li style="margin-bottom:4px;color:#cbd5e1">${i.title} <span style="color:#64748b">(${i.effort} effort, ${i.impact} impact)</span></li>`)
        .join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070b10;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#111827;border-radius:10px;padding:32px;border:1px solid #2a3544">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#22d3ee;font-weight:600">KAIROS</p>
      <h1 style="margin:0 0 4px;font-size:22px;color:#f8fafc">Feedback digest</h1>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px">${dateRange} &bull; ${data.feedbackCount} feedback items</p>

      ${data.summary ? `<div style="background:#0e141c;border-radius:8px;padding:16px;margin-bottom:24px;border:1px solid #2a3544">
        <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:1.5">${data.summary}</p>
      </div>` : ""}

      <h2 style="font-size:16px;color:#f8fafc;margin:0 0 12px;border-bottom:1px solid #2a3544;padding-bottom:8px">High Priority Feedback</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#cbd5e1">${highPriItems}</ul>

      <div style="display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap">
        ${Object.keys(data.categoryBreakdown).length > 0 ? `<div>
          <h3 style="font-size:13px;color:#64748b;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px">By Category</h3>
          <table style="font-size:14px;color:#e2e8f0">${breakdownRows(data.categoryBreakdown)}</table>
        </div>` : ""}
        ${Object.keys(data.priorityBreakdown).length > 0 ? `<div>
          <h3 style="font-size:13px;color:#64748b;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px">By Priority</h3>
          <table style="font-size:14px;color:#e2e8f0">${breakdownRows(data.priorityBreakdown)}</table>
        </div>` : ""}
        ${Object.keys(data.sourceBreakdown).length > 0 ? `<div>
          <h3 style="font-size:13px;color:#64748b;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px">By Source</h3>
          <table style="font-size:14px;color:#e2e8f0">${breakdownRows(data.sourceBreakdown)}</table>
        </div>` : ""}
      </div>

      ${insightItems ? `<h2 style="font-size:16px;color:#f8fafc;margin:0 0 12px;border-bottom:1px solid #2a3544;padding-bottom:8px">Recent Insights</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#cbd5e1">${insightItems}</ul>` : ""}

      ${quickWinItems ? `<h2 style="font-size:16px;color:#f8fafc;margin:0 0 12px;border-bottom:1px solid #2a3544;padding-bottom:8px">Quick Wins</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#cbd5e1">${quickWinItems}</ul>` : ""}

      ${highImpactItems ? `<h2 style="font-size:16px;color:#f8fafc;margin:0 0 12px;border-bottom:1px solid #2a3544;padding-bottom:8px">High Impact Ideas</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#cbd5e1">${highImpactItems}</ul>` : ""}

      <p style="margin:24px 0 0;font-size:12px;color:#64748b;text-align:center">
        Sent by Kairos &bull; <a href="${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/app/pulse-reports" style="color:#22d3ee">View in app</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderPulseReportText(data: PulseReportData): string {
  const dateRange = `${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`;
  const lines: string[] = [
    `Kairos digest - ${dateRange}`,
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
