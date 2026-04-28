import type { DiscoveryBoardActivityRow } from "@customer-pulse/db/queries/discovery";

export type WhosDoingWhatGroup = {
  userId: number | null;
  displayLabel: string;
  /**
   * Most recently updated activities for this person (same rules as the board: assignee, else
   * lead, else "Unassigned").
   */
  activities: Array<{
    id: number;
    title: string;
    status: number;
    updatedAt: Date;
  }>;
  /** How many more active activities this person has beyond `activities` (capped for the hub). */
  moreCount: number;
  /** Total non-archived activities in the slice we grouped (per-person). */
  totalForPerson: number;
};

/**
 * Same "effective owner" as the board filter: `assignee_id` if set, else the insight
 * `discovery_lead_id`, else nobody (shown as "Unassigned").
 */
function effectiveOwnerUserId(row: DiscoveryBoardActivityRow): number | null {
  if (row.assigneeId != null) {
    return row.assigneeId;
  }
  if (row.insightDiscoveryLeadId != null) {
    return row.insightDiscoveryLeadId;
  }
  return null;
}

/**
 * Turn a flat list of board rows (usually non-archived) into a small set of one card per
 * person: what they are working on, most recently touched first.
 */
export function buildWhosDoingWhatGroups(
  rows: DiscoveryBoardActivityRow[],
  options?: { perPersonMax?: number; maxGroups?: number },
): WhosDoingWhatGroup[] {
  const perPersonMax = options?.perPersonMax ?? 4;
  const maxGroups = options?.maxGroups ?? 20;

  const byKey = new Map<string, DiscoveryBoardActivityRow[]>();
  for (const r of rows) {
    const uid = effectiveOwnerUserId(r);
    const key = uid == null ? "unassigned" : `user:${uid}`;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }

  const groups: WhosDoingWhatGroup[] = [];
  for (const [key, list] of byKey) {
    const userId = key === "unassigned" ? null : Number(key.replace(/^user:/, ""));
    // Newest per person, then take the first N for the UI.
    const sorted = [...list].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const label = sorted[0]?.ownerDisplayLabel ?? "Unknown";
    const shown = sorted.slice(0, perPersonMax);
    const moreCount = Math.max(0, sorted.length - perPersonMax);
    groups.push({
      userId,
      displayLabel: label,
      activities: shown.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        updatedAt: a.updatedAt,
      })),
      moreCount,
      totalForPerson: sorted.length,
    });
  }

  groups.sort((a, b) => {
    const unA = a.userId == null;
    const unB = b.userId == null;
    if (unA !== unB) {
      return unA ? 1 : -1;
    }
    if (b.totalForPerson !== a.totalForPerson) {
      return b.totalForPerson - a.totalForPerson;
    }
    return a.displayLabel.localeCompare(b.displayLabel, undefined, { sensitivity: "base" });
  });

  return groups.slice(0, maxGroups);
}

export function whosDoingWhatBoardFilterHref(userId: number | null): string {
  if (userId == null) {
    return "/app/discover/board?owner=unassigned";
  }
  return `/app/discover/board?owner=${userId}`;
}
