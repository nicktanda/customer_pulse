/**
 * Consistent, locale-aware timestamps for lists and dashboards (avoid raw ISO in the UI).
 */

export function formatAppDateTime(d: Date | null | undefined): string {
  if (!d) {
    return "—";
  }
  try {
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d.toISOString();
  }
}

export function formatAppDate(d: Date | null | undefined): string {
  if (!d) {
    return "—";
  }
  try {
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
