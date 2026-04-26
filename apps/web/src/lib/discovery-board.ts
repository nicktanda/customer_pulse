import type { DiscoveryBoardActivityRow } from "@customer-pulse/db/queries/discovery";

/**
 * Status column keys for the discovery Kanban: integers match `DiscoveryActivityStatus` in
 * packages/db (draft=1, in_progress=2, complete=3, archived=4). The array order is column order
 * left-to-right on the board.
 */
export const BOARD_STATUS_COLUMNS = [1, 2, 3, 4] as const;

export type BoardStatusColumn = (typeof BOARD_STATUS_COLUMNS)[number];

/** Labels for board headers — keep aligned with the enum, not the integer values themselves. */
export const boardColumnLabel: Record<BoardStatusColumn, string> = {
  1: "Draft",
  2: "In progress",
  3: "Complete",
  4: "Archived",
};

/**
 * The server action and DB only allow these four values; use this to validate form input.
 */
export function isAllowedDiscoveryBoardStatus(n: number): n is BoardStatusColumn {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

/**
 * If legacy or bad data ever stores an unexpected `status`, bucket it with Draft so the UI
 * still renders one column per card.
 */
function normalizeToColumn(status: number): BoardStatusColumn {
  if (isAllowedDiscoveryBoardStatus(status)) {
    return status;
  }
  return 1;
}

/**
 * Splits the flat list from `listDiscoveryActivitiesForBoard` into four buckets. Each bucket
 * keeps the same order the query returned (newest `updatedAt` first).
 */
export function groupBoardActivitiesByStatus(
  rows: DiscoveryBoardActivityRow[],
): Record<BoardStatusColumn, DiscoveryBoardActivityRow[]> {
  const empty: Record<BoardStatusColumn, DiscoveryBoardActivityRow[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  for (const row of rows) {
    const col = normalizeToColumn(row.status);
    empty[col].push(row);
  }
  return empty;
}

/**
 * Parse `?insight=` from the URL. Non-numeric or non-finite values are treated as "no filter"
 * so a typo does not 404 the whole page.
 */
export function parseBoardInsightParam(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") {
    return undefined;
  }
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) {
    return undefined;
  }
  return n;
}

/** Parsed from `?owner=` — filter the board by effective owner, or unassigned only. */
export type BoardOwnerFilter =
  | { kind: "all" }
  | { kind: "unassigned" }
  | { kind: "user"; userId: number };

/**
 * `?owner=unassigned` | `?owner=12` (user id) | omitted / empty = all.
 */
export function parseBoardOwnerParam(raw: string | undefined): BoardOwnerFilter {
  if (raw == null || raw === "") {
    return { kind: "all" };
  }
  const s = String(raw).trim();
  if (s === "unassigned") {
    return { kind: "unassigned" };
  }
  const n = Number.parseInt(s, 10);
  if (Number.isFinite(n) && n > 0) {
    return { kind: "user", userId: n };
  }
  return { kind: "all" };
}

/**
 * Parsed from `?column=` — limit the board to one **activity status** column (1–4), same as
 * Kanban: Draft, In progress, Complete, Archived (`DiscoveryActivityStatus`).
 */
export type BoardColumnFilter = { kind: "all" } | { kind: "column"; column: BoardStatusColumn };

/**
 * `?column=1` … `?column=4` or omitted = show activities in all columns (default board view).
 */
export function parseBoardColumnParam(raw: string | undefined): BoardColumnFilter {
  if (raw == null || raw === "") {
    return { kind: "all" };
  }
  const n = Number.parseInt(String(raw).trim(), 10);
  if (isAllowedDiscoveryBoardStatus(n)) {
    return { kind: "column", column: n };
  }
  return { kind: "all" };
}

/**
 * Builds a query string for the discovery board, preserving filter combinations
 * (e.g. when clearing one filter but keeping others).
 */
export function toBoardSearchParams(f: {
  insightId?: number;
  owner: BoardOwnerFilter;
  column: BoardColumnFilter;
}): string {
  const p = new URLSearchParams();
  if (f.insightId != null) {
    p.set("insight", String(f.insightId));
  }
  if (f.owner.kind === "unassigned") {
    p.set("owner", "unassigned");
  } else if (f.owner.kind === "user") {
    p.set("owner", String(f.owner.userId));
  }
  if (f.column.kind === "column") {
    p.set("column", String(f.column.column));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
