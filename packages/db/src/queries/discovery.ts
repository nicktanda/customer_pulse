/**
 * Drizzle query helpers for the `discovery_activities` table.
 *
 * All functions accept a `db` instance rather than creating their own connection,
 * matching the pattern used in queries/specs.ts and across the codebase.
 */

import { eq, desc, and, or, isNull, ne, sql, inArray, asc } from "drizzle-orm";
import type { Database } from "../client";
import {
  DiscoveryActivityStatus,
  DiscoveryActivityType,
  DiscoveryInsightStage,
  InsightStatus,
  InsightType,
} from "../enums";
import {
  discoveryActivities,
  feedbackInsights,
  ideaInsights,
  insightStakeholders,
  insightThemes,
  insights,
  projects,
  specInsights,
  teams,
  users,
} from "../schema";

/** Inclusive range for `insights.discovery_stage` (see `DiscoveryInsightStage`). */
const DISCOVERY_STAGE_MIN = DiscoveryInsightStage.framing;
const DISCOVERY_STAGE_MAX = DiscoveryInsightStage.decision;

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single row returned by getActivitiesByInsight — everything the activity list needs. */
export type ActivityListRow = {
  id: number;
  title: string;
  activityType: number;
  status: number;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** The full activity row for the detail page. */
export type ActivityDetailRow = {
  id: number;
  insightId: number;
  projectId: number;
  title: string;
  activityType: number;
  status: number;
  aiGeneratedContent: Record<string, unknown> | null;
  findings: string | null;
  aiGenerated: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  /** Activity-level override; when null, UI falls back to `insightDiscoveryLeadId`. */
  assigneeId: number | null;
  /**
   * From the parent insight row — set on the insight page; when `assigneeId` is null, this
   * person is the effective default owner.
   */
  insightDiscoveryLeadId: number | null;
  /** Parent insight’s discovery process stage (framing → decision). Stage 4. */
  insightDiscoveryStage: number;
};

/**
 * A summary of an insight plus the count of its discovery activities,
 * used on the /app/discover/insights list page.
 */
export type InsightDiscoverySummaryRow = {
  insightId: number;
  insightTitle: string;
  /** `insights.discovery_stage` — process position for this opportunity. */
  discoveryStage: number;
  activityCount: number;
  completeCount: number;
};

/** Minimal row for insight pickers (Discover home, etc.). */
export type InsightTitleRow = {
  id: number;
  title: string;
};

/**
 * One card on the project-wide discovery board (Kanban).
 * `status` is DiscoveryActivityStatus (1–4). Sorted by `updatedAt` so recently touched
 * work surfaces first.
 */
export type DiscoveryBoardActivityRow = {
  id: number;
  title: string;
  activityType: number;
  status: number;
  insightId: number;
  insightTitle: string;
  aiGenerated: boolean;
  updatedAt: Date;
  assigneeId: number | null;
  insightDiscoveryLeadId: number | null;
  /** Single line for the board card — assignee, else insight lead, else unassigned. */
  ownerDisplayLabel: string;
  /** Parent insight’s discovery process stage. */
  insightDiscoveryStage: number;
};

export type ListDiscoveryActivitiesForBoardOptions = {
  /** When set, only activities for this insight (must belong to the same project). */
  insightId?: number;
  /**
   * Only activities whose **effective** owner is this user: `assignee_id` or inherited
   * `insights.discovery_lead_id` when assignee is null.
   */
  effectiveOwnerUserId?: number;
  /** Only rows with no assignee and no insight lead. */
  onlyUnassigned?: boolean;
  /**
   * Only activities in this Kanban column: `DiscoveryActivityStatus` 1–4 (draft → archived).
   * Matches the board columns, not `insights.discovery_stage`.
   */
  activityStatus?: number;
  /** When set, only the first N rows (after the same `order by` as the board: updated desc). */
  limit?: number;
  /**
   * When true, exclude **Archived** (status 4) so lists focus on live work. Compatible with
   * `activityStatus` (if both are set, both apply).
   */
  excludeArchived?: boolean;
};

/**
 * A row for “my discovery” — activities the current user created in this project.
 * Used on `/app/discover/me` (Stage 2 personal queue; `created_by` filter, no assignee yet).
 */
export type MyDiscoveryActivityRow = {
  id: number;
  title: string;
  activityType: number;
  status: number;
  insightId: number;
  insightTitle: string;
  aiGenerated: boolean;
  findings: string | null;
  updatedAt: Date;
  assigneeId: number | null;
  insightDiscoveryLeadId: number | null;
  /** Resolved label for the row — who “owns” this for discovery (assignee, lead, or unassigned). */
  ownerDisplayLabel: string;
  /** Parent insight’s discovery process stage. */
  insightDiscoveryStage: number;
};

/** Input for createDiscoveryActivity. */
export type CreateDiscoveryActivityInput = {
  projectId: number;
  insightId: number;
  activityType: number;
  title: string;
  createdBy: number;
};

/** Input for updating an activity's findings and/or status. */
export type UpdateDiscoveryActivityInput = {
  findings?: string | null;
  status?: number;
  aiGeneratedContent?: Record<string, unknown> | null;
  aiGenerated?: boolean;
  assigneeId?: number | null;
};

/** `projects.ost_map_root` — top of the OST map (Stage 5); goal text only. */
export type ProjectOstMapRoot = { text?: string };

/** One activity line under an insight in the discovery map. */
export type DiscoveryOstMapActivityLine = {
  id: number;
  title: string;
  status: number;
  activityType: number;
  ownerDisplayLabel: string;
};

/** One insight (opportunity) and its discovery experiments. */
export type DiscoveryOstMapInsightGroup = {
  insightId: number;
  insightTitle: string;
  insightDiscoveryStage: number;
  /** Strategy team name when `insights.team_id` is set; otherwise null. */
  teamName: string | null;
  /**
   * Optional solution ideas for the OST map only (`insights.metadata.ost_map_solutions` — string[]).
   */
  solutionOptions: string[];
  activities: DiscoveryOstMapActivityLine[];
};

/** `insights.metadata` key for per-opportunity solution lines on the map (not used elsewhere v1). */
export const OST_MAP_SOLUTIONS_KEY = "ost_map_solutions";

const OST_MAP_SOLUTIONS_MAX = 20;
const OST_MAP_SOLUTION_LINE_MAX = 500;

/** Normalizes `insights.metadata.ost_map_solutions` to a list of non-empty short strings. */
export function parseOstMapSolutionsFromMetadata(metadata: Record<string, unknown> | null | undefined): string[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }
  const raw = metadata[OST_MAP_SOLUTIONS_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t.length > 0) {
        out.push(t.length > OST_MAP_SOLUTION_LINE_MAX ? t.slice(0, OST_MAP_SOLUTION_LINE_MAX) : t);
      }
      if (out.length >= OST_MAP_SOLUTIONS_MAX) {
        break;
      }
    }
  }
  return out;
}

/** Full tree payload for `/app/discover/map`. */
export type DiscoveryOstMapData = {
  projectId: number;
  projectName: string;
  root: ProjectOstMapRoot;
  insightGroups: DiscoveryOstMapInsightGroup[];
};

// ─── Helpers (internal) ───────────────────────────────────────────────────────

function displayNameForUser(u: { name: string | null; email: string } | undefined): string | null {
  if (!u) return null;
  const n = u.name?.trim();
  if (n) return n;
  return u.email || null;
}

/** Loads id → display label for board / “my” lists. */
async function loadUserDisplayLabelMap(
  db: Database,
  ids: number[],
): Promise<Map<number, string>> {
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n)))];
  if (uniq.length === 0) {
    return new Map();
  }
  const list = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, uniq));
  const map = new Map<number, string>();
  for (const u of list) {
    map.set(u.id, displayNameForUser(u) ?? `#${u.id}`);
  }
  return map;
}

function buildOwnerDisplayLabel(
  row: { assigneeId: number | null; insightDiscoveryLeadId: number | null },
  userMap: Map<number, string>,
): string {
  if (row.assigneeId != null) {
    return userMap.get(row.assigneeId) ?? "Unknown";
  }
  if (row.insightDiscoveryLeadId != null) {
    return userMap.get(row.insightDiscoveryLeadId) ?? "Unknown";
  }
  return "Unassigned";
}

/**
 * Resolves the same “effective owner” string used on the board: assignee, else insight lead, else
 * “Unassigned” (activity detail can explain created-by in copy).
 */
export async function getActivityOwnerDisplayLabel(
  db: Database,
  row: Pick<ActivityDetailRow, "assigneeId" | "insightDiscoveryLeadId">,
): Promise<string> {
  const ids: number[] = [];
  if (row.assigneeId != null) {
    ids.push(row.assigneeId);
  }
  if (row.insightDiscoveryLeadId != null) {
    ids.push(row.insightDiscoveryLeadId);
  }
  const userMap = await loadUserDisplayLabelMap(db, ids);
  return buildOwnerDisplayLabel(row, userMap);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns all activities for a specific insight, newest first.
 */
export async function getActivitiesByInsight(
  db: Database,
  insightId: number,
  projectId: number,
): Promise<ActivityListRow[]> {
  return db
    .select({
      id: discoveryActivities.id,
      title: discoveryActivities.title,
      activityType: discoveryActivities.activityType,
      status: discoveryActivities.status,
      aiGenerated: discoveryActivities.aiGenerated,
      createdAt: discoveryActivities.createdAt,
      updatedAt: discoveryActivities.updatedAt,
    })
    .from(discoveryActivities)
    .where(
      and(
        eq(discoveryActivities.insightId, insightId),
        eq(discoveryActivities.projectId, projectId),
      ),
    )
    .orderBy(desc(discoveryActivities.createdAt));
}

/**
 * Returns the full detail row for a single activity, plus insight `discovery_lead_id` for owners.
 */
export async function getActivityById(
  db: Database,
  activityId: number,
  projectId: number,
): Promise<ActivityDetailRow | null> {
  const [r] = await db
    .select({
      id: discoveryActivities.id,
      insightId: discoveryActivities.insightId,
      projectId: discoveryActivities.projectId,
      title: discoveryActivities.title,
      activityType: discoveryActivities.activityType,
      status: discoveryActivities.status,
      aiGeneratedContent: discoveryActivities.aiGeneratedContent,
      findings: discoveryActivities.findings,
      aiGenerated: discoveryActivities.aiGenerated,
      createdBy: discoveryActivities.createdBy,
      createdAt: discoveryActivities.createdAt,
      updatedAt: discoveryActivities.updatedAt,
      assigneeId: discoveryActivities.assigneeId,
      insightDiscoveryLeadId: insights.discoveryLeadId,
      insightDiscoveryStage: insights.discoveryStage,
    })
    .from(discoveryActivities)
    .innerJoin(
      insights,
      and(
        eq(discoveryActivities.insightId, insights.id),
        eq(insights.projectId, projectId),
      ),
    )
    .where(
      and(
        eq(discoveryActivities.id, activityId),
        eq(discoveryActivities.projectId, projectId),
      ),
    )
    .limit(1);

  return r ?? null;
}

/**
 * Returns all insights for a project that have at least one discovery activity,
 * with counts. Used on the /app/discover/insights list page.
 */
export async function getInsightsWithDiscovery(
  db: Database,
  projectId: number,
): Promise<InsightDiscoverySummaryRow[]> {
  /*
   * Join insights → discovery_activities, group by insight, return counts.
   * status=3 is DiscoveryActivityStatus.complete.
   */
  const rows = await db
    .select({
      insightId: insights.id,
      insightTitle: insights.title,
      discoveryStage: insights.discoveryStage,
      activityCount: sql<number>`count(*)::int`,
      completeCount: sql<number>`count(*) filter (where ${discoveryActivities.status} = 3)::int`,
    })
    .from(discoveryActivities)
    .innerJoin(insights, eq(discoveryActivities.insightId, insights.id))
    .where(
      and(
        eq(discoveryActivities.projectId, projectId),
        eq(insights.projectId, projectId),
      ),
    )
    .groupBy(insights.id, insights.title, insights.discoveryStage)
    .orderBy(desc(sql`count(*)`));

  return rows;
}

/**
 * Insight id + title for the current project, newest first — used on /app/discover
 * so PMs can pick an insight and run tools without leaving the page.
 */
export async function listInsightTitlesForProject(
  db: Database,
  projectId: number,
  limit = 200,
): Promise<InsightTitleRow[]> {
  return db
    .select({
      id: insights.id,
      title: insights.title,
    })
    .from(insights)
    .where(eq(insights.projectId, projectId))
    .orderBy(desc(insights.updatedAt))
    .limit(limit);
}

/**
 * All discovery activities for a project (optional insight filter) for the Kanban board.
 * Joins `insights` for the parent insight title. Order: `updatedAt desc`, then `id desc` for a stable sort.
 */
export async function listDiscoveryActivitiesForBoard(
  db: Database,
  projectId: number,
  options?: ListDiscoveryActivitiesForBoardOptions,
): Promise<DiscoveryBoardActivityRow[]> {
  const forProject = and(
    eq(discoveryActivities.projectId, projectId),
    eq(insights.projectId, projectId),
  );
  const insightOr =
    options?.insightId != null && Number.isFinite(options.insightId)
      ? and(forProject, eq(discoveryActivities.insightId, options.insightId))
      : forProject;

  let whereClause = insightOr;
  if (options?.onlyUnassigned) {
    whereClause = and(
      whereClause,
      isNull(discoveryActivities.assigneeId),
      isNull(insights.discoveryLeadId),
    );
  } else if (options?.effectiveOwnerUserId != null) {
    const u = options.effectiveOwnerUserId;
    whereClause = and(
      whereClause,
      or(
        eq(discoveryActivities.assigneeId, u),
        and(
          isNull(discoveryActivities.assigneeId),
          eq(insights.discoveryLeadId, u),
        ),
      ),
    );
  }
  if (
    options?.activityStatus != null &&
    Number.isFinite(options.activityStatus) &&
    (options.activityStatus === 1 ||
      options.activityStatus === 2 ||
      options.activityStatus === 3 ||
      options.activityStatus === 4)
  ) {
    whereClause = and(whereClause, eq(discoveryActivities.status, options.activityStatus));
  }
  if (options?.excludeArchived) {
    whereClause = and(
      whereClause,
      ne(discoveryActivities.status, DiscoveryActivityStatus.archived),
    );
  }

  const maxRows =
    options?.limit != null && Number.isFinite(options.limit) && options.limit > 0
      ? options.limit
      : null;

  const q = db
    .select({
      id: discoveryActivities.id,
      title: discoveryActivities.title,
      activityType: discoveryActivities.activityType,
      status: discoveryActivities.status,
      insightId: discoveryActivities.insightId,
      insightTitle: insights.title,
      aiGenerated: discoveryActivities.aiGenerated,
      updatedAt: discoveryActivities.updatedAt,
      assigneeId: discoveryActivities.assigneeId,
      insightDiscoveryLeadId: insights.discoveryLeadId,
      insightDiscoveryStage: insights.discoveryStage,
    })
    .from(discoveryActivities)
    .innerJoin(insights, eq(discoveryActivities.insightId, insights.id))
    .where(whereClause)
    .orderBy(desc(discoveryActivities.updatedAt), desc(discoveryActivities.id));

  const baseRows = maxRows != null ? await q.limit(maxRows) : await q;

  const allIds: number[] = [];
  for (const r of baseRows) {
    if (r.assigneeId != null) {
      allIds.push(r.assigneeId);
    }
    if (r.insightDiscoveryLeadId != null) {
      allIds.push(r.insightDiscoveryLeadId);
    }
  }
  const userMap = await loadUserDisplayLabelMap(db, allIds);

  return baseRows.map((r) => {
    const base = {
      assigneeId: r.assigneeId,
      insightDiscoveryLeadId: r.insightDiscoveryLeadId,
    };
    return {
      ...r,
      ownerDisplayLabel: buildOwnerDisplayLabel(base, userMap),
    };
  });
}

/** Counts of `discovery_activities` by status for a project (Discover hub / board overview). */
export type DiscoveryActivityStatusCounts = {
  total: number;
  draft: number;
  inProgress: number;
  complete: number;
  archived: number;
};

/**
 * How many activities sit in each Kanban column, plus the total, for the current project.
 */
export async function getDiscoveryActivityStatusCounts(
  db: Database,
  projectId: number,
): Promise<DiscoveryActivityStatusCounts> {
  const rows = await db
    .select({
      status: discoveryActivities.status,
      n: sql<number>`count(*)::int`,
    })
    .from(discoveryActivities)
    .where(eq(discoveryActivities.projectId, projectId))
    .groupBy(discoveryActivities.status);

  const out: DiscoveryActivityStatusCounts = {
    total: 0,
    draft: 0,
    inProgress: 0,
    complete: 0,
    archived: 0,
  };
  for (const r of rows) {
    out.total += r.n;
    if (r.status === 1) {
      out.draft = r.n;
    } else if (r.status === 2) {
      out.inProgress = r.n;
    } else if (r.status === 3) {
      out.complete = r.n;
    } else if (r.status === 4) {
      out.archived = r.n;
    }
  }
  return out;
}

/**
 * Personal discovery queue: activities where the **effective** owner is this user
 * (assignee, else insight lead, else created_by when no assignments — Stage 2 + 3).
 */
export async function listMyDiscoveryActivitiesForUser(
  db: Database,
  projectId: number,
  userId: number,
): Promise<MyDiscoveryActivityRow[]> {
  const myWork = or(
    eq(discoveryActivities.assigneeId, userId),
    and(
      isNull(discoveryActivities.assigneeId),
      eq(insights.discoveryLeadId, userId),
    ),
    and(
      isNull(discoveryActivities.assigneeId),
      isNull(insights.discoveryLeadId),
      eq(discoveryActivities.createdBy, userId),
    ),
  );
  const baseRows = await db
    .select({
      id: discoveryActivities.id,
      title: discoveryActivities.title,
      activityType: discoveryActivities.activityType,
      status: discoveryActivities.status,
      insightId: discoveryActivities.insightId,
      insightTitle: insights.title,
      aiGenerated: discoveryActivities.aiGenerated,
      findings: discoveryActivities.findings,
      updatedAt: discoveryActivities.updatedAt,
      assigneeId: discoveryActivities.assigneeId,
      insightDiscoveryLeadId: insights.discoveryLeadId,
      insightDiscoveryStage: insights.discoveryStage,
    })
    .from(discoveryActivities)
    .innerJoin(insights, eq(discoveryActivities.insightId, insights.id))
    .where(
      and(
        eq(discoveryActivities.projectId, projectId),
        eq(insights.projectId, projectId),
        myWork,
      ),
    )
    .orderBy(desc(discoveryActivities.updatedAt), desc(discoveryActivities.id));

  const allIds: number[] = [];
  for (const r of baseRows) {
    if (r.assigneeId != null) {
      allIds.push(r.assigneeId);
    }
    if (r.insightDiscoveryLeadId != null) {
      allIds.push(r.insightDiscoveryLeadId);
    }
  }
  const userMap = await loadUserDisplayLabelMap(db, allIds);
  return baseRows.map((r) => {
    const base = {
      assigneeId: r.assigneeId,
      insightDiscoveryLeadId: r.insightDiscoveryLeadId,
    };
    return {
      ...r,
      ownerDisplayLabel: buildOwnerDisplayLabel(base, userMap),
    };
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts a new discovery activity row and returns the new id.
 * Status defaults to 1 (draft).
 */
export async function createDiscoveryActivity(
  db: Database,
  input: CreateDiscoveryActivityInput,
): Promise<number> {
  const now = new Date();
  const [row] = await db
    .insert(discoveryActivities)
    .values({
      projectId: input.projectId,
      insightId: input.insightId,
      activityType: input.activityType,
      title: input.title,
      status: 1, // draft
      aiGenerated: false,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: discoveryActivities.id });

  if (!row) {
    throw new Error("createDiscoveryActivity: insert did not return a row");
  }

  return row.id;
}

/**
 * Creates an opportunity (`insights` row) plus one draft discovery activity so the work shows up
 * on the discovery map, board, and insight list — same pipeline as when you add an activity from
 * the insight page.
 */
export async function createInsightWithInitialDiscoveryActivity(
  db: Database,
  input: { projectId: number; createdByUserId: number; title: string },
): Promise<{ insightId: number; activityId: number }> {
  const t = input.title.trim();
  if (t.length === 0) {
    throw new Error("createInsightWithInitialDiscoveryActivity: title required");
  }
  const now = new Date();
  return await db.transaction(async (tx) => {
    const [ins] = await tx
      .insert(insights)
      .values({
        projectId: input.projectId,
        title: t.slice(0, 255),
        description: "Added from the discovery map.",
        insightType: InsightType.opportunity,
        severity: 0,
        confidenceScore: 0,
        affectedUsersCount: 0,
        feedbackCount: 0,
        status: InsightStatus.discovered,
        evidence: [],
        metadata: { created_from: "discovery_map" },
        discoveredAt: now,
        createdAt: now,
        updatedAt: now,
        discoveryStage: DiscoveryInsightStage.framing,
      })
      .returning({ id: insights.id });

    if (!ins) {
      throw new Error("createInsightWithInitialDiscoveryActivity: insight insert failed");
    }

    const [act] = await tx
      .insert(discoveryActivities)
      .values({
        projectId: input.projectId,
        insightId: ins.id,
        activityType: DiscoveryActivityType.interview_guide,
        title: "First experiment",
        status: DiscoveryActivityStatus.draft,
        aiGenerated: false,
        createdBy: input.createdByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: discoveryActivities.id });

    if (!act) {
      throw new Error("createInsightWithInitialDiscoveryActivity: activity insert failed");
    }

    return { insightId: ins.id, activityId: act.id };
  });
}

/**
 * Updates an activity's findings, status, or AI-generated content.
 * Only the fields present in `input` are written.
 */
export async function updateDiscoveryActivity(
  db: Database,
  activityId: number,
  projectId: number,
  input: UpdateDiscoveryActivityInput,
): Promise<void> {
  const updates: Partial<typeof discoveryActivities.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.findings !== undefined) updates.findings = input.findings;
  if (input.status !== undefined) updates.status = input.status;
  if (input.aiGeneratedContent !== undefined) updates.aiGeneratedContent = input.aiGeneratedContent ?? undefined;
  if (input.aiGenerated !== undefined) updates.aiGenerated = input.aiGenerated;
  if (input.assigneeId !== undefined) {
    updates.assigneeId = input.assigneeId;
  }

  await db
    .update(discoveryActivities)
    .set(updates)
    .where(
      and(
        eq(discoveryActivities.id, activityId),
        eq(discoveryActivities.projectId, projectId),
      ),
    );
}

/**
 * Sets who “owns” discovery for this insight by default (activities without `assignee_id` inherit it).
 */
export async function setInsightDiscoveryLeadId(
  db: Database,
  insightId: number,
  projectId: number,
  discoveryLeadId: number | null,
): Promise<void> {
  await db
    .update(insights)
    .set({ discoveryLeadId, updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

/**
 * Sets the insight’s discovery **process** stage (framing through decision). Integer 1–5;
 * see `DiscoveryInsightStage` in `enums.ts`.
 */
export async function setInsightDiscoveryStage(
  db: Database,
  insightId: number,
  projectId: number,
  discoveryStage: number,
): Promise<void> {
  if (discoveryStage < DISCOVERY_STAGE_MIN || discoveryStage > DISCOVERY_STAGE_MAX) {
    throw new Error(`setInsightDiscoveryStage: stage out of range (${discoveryStage})`);
  }
  await db
    .update(insights)
    .set({ discoveryStage, updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

/**
 * Sets or clears the optional Strategy-tab team for an insight. Callers must ensure
 * `teamId` (when non-null) belongs to `projectId` before invoking.
 */
export async function setInsightTeamId(
  db: Database,
  insightId: number,
  projectId: number,
  teamId: number | null,
): Promise<void> {
  await db
    .update(insights)
    .set({ teamId, updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

// ─── OST / discovery map (Stage 5) ───────────────────────────────────────────

/**
 * Read-first tree: project root goal → insights with discovery → activities.
 * Only insights that have at least one activity appear (same spirit as “insights in discovery”).
 */
export async function getDiscoveryOstMap(
  db: Database,
  projectId: number,
): Promise<DiscoveryOstMapData> {
  const [proj] = await db
    .select({ id: projects.id, name: projects.name, ostMapRoot: projects.ostMapRoot })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!proj) {
    throw new Error("getDiscoveryOstMap: project not found");
  }

  const raw = await db
    .select({
      id: discoveryActivities.id,
      title: discoveryActivities.title,
      status: discoveryActivities.status,
      activityType: discoveryActivities.activityType,
      assigneeId: discoveryActivities.assigneeId,
      insightId: discoveryActivities.insightId,
      insightTitle: insights.title,
      insightMetadata: insights.metadata,
      insightDiscoveryStage: insights.discoveryStage,
      insightDiscoveryLeadId: insights.discoveryLeadId,
      teamName: teams.name,
    })
    .from(discoveryActivities)
    .innerJoin(
      insights,
      and(
        eq(discoveryActivities.insightId, insights.id),
        eq(insights.projectId, projectId),
      ),
    )
    .leftJoin(
      teams,
      and(eq(insights.teamId, teams.id), eq(teams.projectId, projectId)),
    )
    .where(eq(discoveryActivities.projectId, projectId))
    .orderBy(asc(insights.title), desc(discoveryActivities.updatedAt), desc(discoveryActivities.id));

  const allIds: number[] = [];
  for (const r of raw) {
    if (r.assigneeId != null) {
      allIds.push(r.assigneeId);
    }
    if (r.insightDiscoveryLeadId != null) {
      allIds.push(r.insightDiscoveryLeadId);
    }
  }
  const userMap = await loadUserDisplayLabelMap(db, allIds);

  const byInsight = new Map<number, DiscoveryOstMapInsightGroup>();
  for (const r of raw) {
    const ownerDisplayLabel = buildOwnerDisplayLabel(
      { assigneeId: r.assigneeId, insightDiscoveryLeadId: r.insightDiscoveryLeadId },
      userMap,
    );
    const line: DiscoveryOstMapActivityLine = {
      id: r.id,
      title: r.title,
      status: r.status,
      activityType: r.activityType,
      ownerDisplayLabel,
    };
    const existing = byInsight.get(r.insightId);
    if (existing) {
      existing.activities.push(line);
    } else {
      const solutionOptions = parseOstMapSolutionsFromMetadata(
        r.insightMetadata as Record<string, unknown> | null | undefined,
      );
      byInsight.set(r.insightId, {
        insightId: r.insightId,
        insightTitle: r.insightTitle,
        insightDiscoveryStage: r.insightDiscoveryStage,
        teamName: r.teamName ?? null,
        solutionOptions,
        activities: [line],
      });
    }
  }

  const insightGroups = [...byInsight.values()];

  const rawRoot = proj.ostMapRoot as { text?: string } | null | undefined;
  const root: ProjectOstMapRoot = {
    ...(rawRoot?.text != null && String(rawRoot.text).trim() !== ""
      ? { text: String(rawRoot.text).trim() }
      : {}),
  };

  return {
    projectId: proj.id,
    projectName: proj.name,
    root,
    insightGroups,
  };
}

/**
 * Saves the top-of-tree goal for the OST map. Editors only from the app layer.
 */
export async function setProjectOstMapRoot(
  db: Database,
  projectId: number,
  root: ProjectOstMapRoot,
): Promise<void> {
  const payload: ProjectOstMapRoot = {};
  const t = root.text?.trim();
  if (t) {
    payload.text = t;
  }
  await db
    .update(projects)
    .set({ ostMapRoot: payload, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

/**
 * Appends a solution line to `insights.metadata.ost_map_solutions` (map UI only; merges other metadata keys).
 */
export async function appendOstMapSolution(
  db: Database,
  insightId: number,
  projectId: number,
  line: string,
): Promise<void> {
  const t = line.trim();
  if (t.length === 0) {
    return;
  }
  const text = t.length > OST_MAP_SOLUTION_LINE_MAX ? t.slice(0, OST_MAP_SOLUTION_LINE_MAX) : t;
  const [row] = await db
    .select({ metadata: insights.metadata })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);
  if (!row) {
    return;
  }
  const meta: Record<string, unknown> = {
    ...((row.metadata as Record<string, unknown> | null | undefined) ?? {}),
  };
  const cur = parseOstMapSolutionsFromMetadata(meta);
  if (cur.length >= OST_MAP_SOLUTIONS_MAX) {
    return;
  }
  cur.push(text);
  meta[OST_MAP_SOLUTIONS_KEY] = cur;
  await db
    .update(insights)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

/**
 * Removes a solution line by index from `insights.metadata.ost_map_solutions`.
 */
export async function removeOstMapSolution(
  db: Database,
  insightId: number,
  projectId: number,
  index: number,
): Promise<void> {
  if (!Number.isInteger(index) || index < 0) {
    return;
  }
  const [row] = await db
    .select({ metadata: insights.metadata })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);
  if (!row) {
    return;
  }
  const meta: Record<string, unknown> = {
    ...((row.metadata as Record<string, unknown> | null | undefined) ?? {}),
  };
  const cur = parseOstMapSolutionsFromMetadata(meta);
  if (index >= cur.length) {
    return;
  }
  cur.splice(index, 1);
  if (cur.length === 0) {
    delete meta[OST_MAP_SOLUTIONS_KEY];
  } else {
    meta[OST_MAP_SOLUTIONS_KEY] = cur;
  }
  await db
    .update(insights)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

/**
 * Replaces one solution line at `index` in `insights.metadata.ost_map_solutions`.
 */
export async function updateOstMapSolution(
  db: Database,
  insightId: number,
  projectId: number,
  index: number,
  newLine: string,
): Promise<void> {
  if (!Number.isInteger(index) || index < 0) {
    return;
  }
  const t = newLine.trim();
  if (t.length === 0) {
    return;
  }
  const text = t.length > OST_MAP_SOLUTION_LINE_MAX ? t.slice(0, OST_MAP_SOLUTION_LINE_MAX) : t;
  const [row] = await db
    .select({ metadata: insights.metadata })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);
  if (!row) {
    return;
  }
  const meta: Record<string, unknown> = {
    ...((row.metadata as Record<string, unknown> | null | undefined) ?? {}),
  };
  const cur = parseOstMapSolutionsFromMetadata(meta);
  if (index >= cur.length) {
    return;
  }
  cur[index] = text;
  meta[OST_MAP_SOLUTIONS_KEY] = cur;
  await db
    .update(insights)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

/** Updates the insight’s title (e.g. from the OST map). */
export async function updateInsightTitle(
  db: Database,
  insightId: number,
  projectId: number,
  title: string,
): Promise<void> {
  const t = title.trim();
  if (t.length === 0) {
    return;
  }
  await db
    .update(insights)
    .set({ title: t.slice(0, 255), updatedAt: new Date() })
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
}

/** Updates a discovery activity title in the current project. */
export async function updateDiscoveryActivityTitle(
  db: Database,
  activityId: number,
  projectId: number,
  title: string,
): Promise<void> {
  const t = title.trim();
  if (t.length === 0) {
    return;
  }
  await db
    .update(discoveryActivities)
    .set({ title: t.slice(0, 255), updatedAt: new Date() })
    .where(and(eq(discoveryActivities.id, activityId), eq(discoveryActivities.projectId, projectId)));
}

/** Removes one discovery activity row. */
export async function deleteDiscoveryActivity(
  db: Database,
  activityId: number,
  projectId: number,
): Promise<void> {
  await db
    .delete(discoveryActivities)
    .where(
      and(eq(discoveryActivities.id, activityId), eq(discoveryActivities.projectId, projectId)),
    );
}

/**
 * Deletes an insight and child rows, then the insight. Used from the OST map when
 * removing an entire opportunity.
 */
export async function deleteInsightAndRelated(
  db: Database,
  insightId: number,
  projectId: number,
): Promise<void> {
  const [row] = await db
    .select({ id: insights.id })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)))
    .limit(1);
  if (!row) {
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(discoveryActivities)
      .where(
        and(
          eq(discoveryActivities.insightId, insightId),
          eq(discoveryActivities.projectId, projectId),
        ),
      );
    await tx.delete(feedbackInsights).where(eq(feedbackInsights.insightId, insightId));
    await tx.delete(insightThemes).where(eq(insightThemes.insightId, insightId));
    await tx.delete(insightStakeholders).where(eq(insightStakeholders.insightId, insightId));
    await tx.delete(ideaInsights).where(eq(ideaInsights.insightId, insightId));
    await tx.delete(specInsights).where(eq(specInsights.insightId, insightId));
    await tx
      .delete(insights)
      .where(and(eq(insights.id, insightId), eq(insights.projectId, projectId)));
  });
}
