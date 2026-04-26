import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { InlineAlert, PageHeader, PageShell, PaginationNav, PeekPanelNotFound } from "@/components/ui";
import { auth } from "@/auth";
import { getRequestDb } from "@/lib/db";
import { feedbacks } from "@customer-pulse/db/client";
import { getCurrentProjectIdForUser, getCurrentProjectSummaryForUser } from "@/lib/current-project";
import { userCanEditProject } from "@/lib/project-access";
import { buildFeedbackConditions } from "@/lib/feedback-filters";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_SOURCE_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "@/lib/feedback-enums-display";
import {
  compactSortQueryFields,
  feedbackListHref,
  parseFeedbackListSortFromParams,
  type FeedbackListQuery,
  type FeedbackSortColumn,
} from "@/lib/feedback-list-query";
import { getAdjacentFeedbackIds } from "@/lib/feedback-adjacent";
import {
  FEEDBACK_LIST_BULK_FORM_ID,
  FeedbackBulkToolbarGate,
} from "@/components/feedback/FeedbackBulkToolbarGate";
import { FeedbackSelectAll } from "@/components/feedback/FeedbackSelectAll";
import { FeedbackTableSortHeader } from "@/components/feedback/FeedbackTableSortHeader";
import { FeedbackListRows, type FeedbackListRowModel } from "@/components/feedback/FeedbackListRows";
import { FeedbackDetailBody } from "@/components/feedback/FeedbackDetailBody";
import { FeedbackDetailPanelHeader } from "@/components/feedback/FeedbackDetailPanelHeader";
import { FeedbackDrawerPanel } from "@/components/feedback/FeedbackDrawerPanel";
import { bulkUpdateFeedbackAction } from "./actions";

const PAGE_SIZE = 20;

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const projectId = await getCurrentProjectIdForUser(userId);
  const projectSummary = await getCurrentProjectSummaryForUser(userId);
  const spRaw = await searchParams;
  const sp = {
    source: typeof spRaw.source === "string" ? spRaw.source : undefined,
    category: typeof spRaw.category === "string" ? spRaw.category : undefined,
    priority: typeof spRaw.priority === "string" ? spRaw.priority : undefined,
    status: typeof spRaw.status === "string" ? spRaw.status : undefined,
    q: typeof spRaw.q === "string" ? spRaw.q : undefined,
    ai: typeof spRaw.ai === "string" ? spRaw.ai : undefined,
  };

  const { sort: sortKey, dir: sortDir } = parseFeedbackListSortFromParams({
    sort: typeof spRaw.sort === "string" ? spRaw.sort : undefined,
    dir: typeof spRaw.dir === "string" ? spRaw.dir : undefined,
  });
  const sortQueryFields = compactSortQueryFields(sortKey, sortDir);
  const page = Math.max(1, Number.parseInt(typeof spRaw.page === "string" ? spRaw.page : "1", 10) || 1);
  const detailParsed = Number.parseInt(typeof spRaw.detail === "string" ? spRaw.detail : "", 10);
  const detailId = Number.isFinite(detailParsed) && detailParsed > 0 ? detailParsed : null;

  if (projectId == null) {
    return (
      <PageShell width="full">
        <PageHeader
          title="Feedback"
          description="Join or create a project first — then set your active project under Settings."
        />
      </PageShell>
    );
  }

  const canEdit = await userCanEditProject(userId, projectId);
  const db = await getRequestDb();
  const where = buildFeedbackConditions(projectId, sp);

  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(feedbacks)
    .where(where);

  const total = countRow?.c ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const offset = (page - 1) * PAGE_SIZE;

  // Which column and direction to ORDER BY (driven by `?sort=` and `?dir=`).
  const orderColumn =
    sortKey === "title" ? feedbacks.title : sortKey === "id" ? feedbacks.id : feedbacks.createdAt;
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: feedbacks.id,
      title: feedbacks.title,
      content: feedbacks.content,
      source: feedbacks.source,
      category: feedbacks.category,
      priority: feedbacks.priority,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
    })
    .from(feedbacks)
    .where(where)
    .orderBy(orderFn(orderColumn))
    .limit(PAGE_SIZE)
    .offset(offset);

  /** Everything except `page` — used for filter chips, pagination base, and `?detail=` panel. */
  const filterOnly: FeedbackListQuery = {
    source: sp.source,
    category: sp.category,
    priority: sp.priority,
    status: sp.status,
    q: sp.q,
    ai: sp.ai === "pending" || sp.ai === "processed" ? sp.ai : undefined,
    detail: detailId ?? undefined,
    ...sortQueryFields,
  };

  let detailRow: typeof feedbacks.$inferSelect | null = null;
  let detailNeighbors = { newerId: null as number | null, olderId: null as number | null };
  if (detailId != null) {
    const [full] = await db
      .select()
      .from(feedbacks)
      .where(and(eq(feedbacks.id, detailId), eq(feedbacks.projectId, projectId)))
      .limit(1);
    if (full) {
      detailRow = full;
      detailNeighbors = await getAdjacentFeedbackIds(db, projectId, full);
    }
  }

  const listReturnPath =
    detailRow != null
      ? feedbackListHref({ ...filterOnly, page: page > 1 ? page : undefined })
      : null;

  const closePanelHref = feedbackListHref({
    ...filterOnly,
    detail: undefined,
    page: page > 1 ? page : undefined,
  });

  const neighborHrefInPanel = (id: number) =>
    feedbackListHref({ ...filterOnly, page: page > 1 ? page : undefined, detail: id });

  /** Shown inside the side panel after “Re-run AI” when `return_path` pointed at this list URL. */
  const detailReprocessNotice =
    detailRow != null && typeof spRaw.notice === "string" && spRaw.notice === "reprocess" ? "reprocess" : null;

  const listStateWithPage = (p: number): FeedbackListQuery => ({ ...filterOnly, page: p > 1 ? p : undefined });

  const notice =
    typeof spRaw.notice === "string"
      ? spRaw.notice === "bulk"
        ? "Bulk update applied."
        : null
      : null;
  const err =
    typeof spRaw.error === "string"
      ? spRaw.error === "bulk"
        ? "Select items and at least one field to update."
        : null
      : null;

  const prevHref =
    page > 1
      ? feedbackListHref(listStateWithPage(page - 1))
      : null;
  const nextHref =
    page < totalPages
      ? feedbackListHref(listStateWithPage(page + 1))
      : null;

  const activeChips = buildActiveFilterChips(filterOnly);

  /** Per-row URLs for the client list (Server → Client cannot pass functions, only serializable data). */
  const rowsWithDetailHref = rows.map((r) => ({
    ...r,
    detailHref: feedbackListHref({ ...filterOnly, page: page > 1 ? page : undefined, detail: r.id }),
  }));

  const pageHeader = (
    <PageHeader
      title="Feedback"
      description={
        <>
          <span className="fw-medium">{projectSummary?.name ?? `Project #${projectId}`}</span>
          <span className="text-body-secondary">
            {" "}
            — {total} items (page {page} of {totalPages})
          </span>
        </>
      }
    />
  );

  return (
    <PageShell width="full">
      {pageHeader}

      {notice ? (
        <InlineAlert variant="success" className="mt-3">
          {notice}
        </InlineAlert>
      ) : null}
      {err ? (
        <InlineAlert variant="danger" className="mt-3">
          {err}
        </InlineAlert>
      ) : null}

      {/*
       * Pass detailId so the filter form preserves ?detail= when the panel is open.
       * That way applying a new filter keeps the same item selected.
       */}
      <FeedbackFiltersSection
        detailId={detailId}
        sp={sp}
        activeChips={activeChips}
        sortPreserve={sortQueryFields}
      />

      {/* Bulk form only wraps the list — triage/reprocess forms live in the drawer (no nested forms). */}
      <div className="mt-4">
        {canEdit ? (
          <form id={FEEDBACK_LIST_BULK_FORM_ID} action={bulkUpdateFeedbackAction}>
            <FeedbackBulkAndResults
              rows={rows}
              rowsWithDetailHref={rowsWithDetailHref}
              total={total}
              canEdit
              detailRowId={detailRow?.id ?? null}
              listQuery={filterOnly}
              sortKey={sortKey}
              sortDir={sortDir}
            />
          </form>
        ) : (
          <FeedbackBulkAndResults
            rows={rows}
            rowsWithDetailHref={rowsWithDetailHref}
            total={total}
            canEdit={false}
            detailRowId={detailRow?.id ?? null}
            listQuery={filterOnly}
            sortKey={sortKey}
            sortDir={sortDir}
          />
        )}

        <PaginationNav
          className="mt-3"
          prevHref={prevHref}
          nextHref={nextHref}
          status={`Page ${page} of ${totalPages}`}
        />
      </div>

      {detailId != null ? (
        <>
          {/*
           * Semi-transparent backdrop — rendered as a <Link> so clicking anywhere
           * outside the drawer navigates back to the list (closes the panel).
           */}
          <Link
            href={closePanelHref}
            className="peek-drawer-backdrop"
            aria-label="Close detail panel"
          />

          {/* Resizable overlay drawer — slides in from the right, single scroll context */}
          <FeedbackDrawerPanel>
            {detailRow != null ? (
              <>
                <FeedbackDetailPanelHeader
                  feedbackId={detailRow.id}
                  title={detailRow.title || "(no title)"}
                  closePanelHref={closePanelHref}
                  prevHref={
                    detailNeighbors.newerId != null
                      ? neighborHrefInPanel(detailNeighbors.newerId)
                      : null
                  }
                  nextHref={
                    detailNeighbors.olderId != null
                      ? neighborHrefInPanel(detailNeighbors.olderId)
                      : null
                  }
                />
                <FeedbackDetailBody
                  row={detailRow}
                  feedbackId={detailRow.id}
                  canEdit={canEdit}
                  notice={detailReprocessNotice}
                  listReturnPath={listReturnPath}
                  variant="panel"
                />
              </>
            ) : (
              <PeekPanelNotFound
                message="No feedback found for this id in the current project."
                closeHref={closePanelHref}
              />
            )}
          </FeedbackDrawerPanel>
        </>
      ) : null}
    </PageShell>
  );
}

type FeedbackPageFilterSp = {
  source?: string;
  category?: string;
  priority?: string;
  status?: string;
  q?: string;
  ai?: string;
};

/** Filter card + active chips (shared layout for list-only vs master–detail). */
function FeedbackFiltersSection({
  detailId,
  sp,
  activeChips,
  sortPreserve,
}: {
  detailId: number | null;
  sp: FeedbackPageFilterSp;
  activeChips: { key: string; label: string; clearHref: string }[];
  /** Carry `sort` / `dir` through “Filter” submits without showing extra fields. */
  sortPreserve: Pick<FeedbackListQuery, "sort" | "dir">;
}) {
  // When the URL already has filters, open the panel on load so users see the fields that produced this view.
  const filtersOpenInitially = activeChips.length > 0;

  return (
    <>
      <section
        className={detailId != null ? "mb-3" : "mt-4"}
        aria-labelledby="feedback-filters-heading"
      >
        <h2 id="feedback-filters-heading" className="visually-hidden">
          Filter feedback
        </h2>
        {/* Native <details> = no JS; click the header row to show or hide the form. Chips stay below so you still see active filters when collapsed. */}
        <details className="card shadow-sm border-secondary-subtle" open={filtersOpenInitially}>
          <summary
            className="card-header py-2 px-3 bg-body-secondary border-secondary-subtle small fw-semibold text-body-secondary"
            style={{ cursor: "pointer" }}
          >
            Find feedback
            {activeChips.length > 0 ? (
              <span className="badge text-bg-secondary ms-2 align-middle">
                {activeChips.length} filter{activeChips.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </summary>
          <div className="card-body py-2 px-3">
            <p className="small text-body-secondary mb-2 mb-md-3">
              Narrow the list, then use Filter. Bookmark the URL to save a view. Click a row to open details on
              the right.
            </p>
            <form method="get" className="d-flex flex-wrap align-items-end gap-2">
              {detailId != null ? <input type="hidden" name="detail" value={String(detailId)} /> : null}
              {sortPreserve.sort != null ? (
                <input type="hidden" name="sort" value={sortPreserve.sort} />
              ) : null}
              {sortPreserve.dir != null ? (
                <input type="hidden" name="dir" value={sortPreserve.dir} />
              ) : null}
              <FilterSelect name="source" label="Source" value={sp.source} options={FEEDBACK_SOURCE_LABELS} />
              <FilterSelect name="category" label="Category" value={sp.category} options={FEEDBACK_CATEGORY_LABELS} />
              <FilterSelect name="priority" label="Priority" value={sp.priority} options={FEEDBACK_PRIORITY_LABELS} />
              <FilterSelect name="status" label="Status" value={sp.status} options={FEEDBACK_STATUS_LABELS} />
              <AiFilterSelect value={sp.ai} />
              <div className="mb-0">
                <label htmlFor="feedback-q" className="form-label small mb-1">
                  Search
                </label>
                <input
                  id="feedback-q"
                  name="q"
                  defaultValue={sp.q ?? ""}
                  className="form-control form-control-sm"
                  style={{ minWidth: "12rem" }}
                  placeholder="Title, body, author…"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Filter
              </button>
              <Link href="/app/learn/feedback" className="small link-secondary">
                Clear all
              </Link>
            </form>
          </div>
        </details>
      </section>

      {activeChips.length > 0 ? (
        <div
          className={`d-flex flex-wrap align-items-center gap-2 ${detailId != null ? "mb-3" : "mt-3"}`}
          aria-label="Active filters"
        >
          <span className="small text-body-secondary fw-semibold">Active:</span>
          {activeChips.map((c) => (
            <Link
              key={c.key}
              href={c.clearHref}
              className="badge rounded-pill text-bg-light border text-decoration-none feedback-filter-chip"
            >
              <span className="me-1">{c.label}</span>
              <span className="text-body-tertiary" aria-hidden>
                ×
              </span>
              <span className="visually-hidden">Remove filter</span>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Bulk toolbar + results table (wrapped in `<form>` by the parent when the user can edit). */
function FeedbackBulkAndResults({
  rows,
  rowsWithDetailHref,
  total,
  canEdit,
  detailRowId,
  listQuery,
  sortKey,
  sortDir,
}: {
  rows: Omit<FeedbackListRowModel, "detailHref">[];
  rowsWithDetailHref: FeedbackListRowModel[];
  total: number;
  canEdit: boolean;
  detailRowId: number | null;
  listQuery: FeedbackListQuery;
  sortKey: FeedbackSortColumn;
  sortDir: "asc" | "desc";
}) {
  return (
    <>
      {canEdit ? (
        <FeedbackBulkToolbarGate>
          {/* Shown only when two or more row checkboxes are checked (client-side). */}
          <details className="card border-primary border-opacity-25 shadow-sm mb-3 feedback-bulk-toolbar" open>
            <summary
              className="card-header py-2 px-3 bg-primary bg-opacity-10 border-primary border-opacity-25 small fw-semibold text-body"
              style={{ cursor: "pointer" }}
            >
              Bulk actions
            </summary>
            <div className="card-body py-2 px-3">
              <p className="small text-body-secondary mb-2 mb-md-3">
                Choose status, priority, and/or category, then Apply — only affects the rows you ticked above.
              </p>
              <div className="d-flex flex-wrap align-items-end gap-2">
                <BulkSelect name="bulk_status" label="Status" options={FEEDBACK_STATUS_LABELS} />
                <BulkSelect name="bulk_priority" label="Priority" options={FEEDBACK_PRIORITY_LABELS} />
                <BulkSelect name="bulk_category" label="Category" options={FEEDBACK_CATEGORY_LABELS} />
                <button type="submit" className="btn btn-secondary btn-sm">
                  Apply to selected
                </button>
              </div>
            </div>
          </details>
        </FeedbackBulkToolbarGate>
      ) : null}

      <section aria-labelledby="feedback-results-heading">
        <h2 id="feedback-results-heading" className="h6 text-body-emphasis mb-2">
          Results
        </h2>
        {rows.length === 0 ? (
          <p className="text-body-secondary small mb-0">
            {total === 0 ? (
              <>
                No feedback in this project yet.{" "}
                <Link href="/app/integrations" className="link-primary">
                  Connect an integration
                </Link>{" "}
                to ingest items.
              </>
            ) : (
              "No feedback matches these filters."
            )}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 feedback-results-table">
              <thead>
                <tr>
                  {canEdit ? (
                    <th scope="col" className="text-center" style={{ width: "2.5rem" }}>
                      <FeedbackSelectAll />
                    </th>
                  ) : null}
                  <FeedbackTableSortHeader
                    column="title"
                    label="Feedback"
                    listQuery={listQuery}
                    activeSort={sortKey}
                    activeDir={sortDir}
                  />
                  <FeedbackTableSortHeader
                    column="id"
                    label="ID"
                    listQuery={listQuery}
                    activeSort={sortKey}
                    activeDir={sortDir}
                    className="text-nowrap"
                  />
                  <FeedbackTableSortHeader
                    column="received"
                    label="Received"
                    listQuery={listQuery}
                    activeSort={sortKey}
                    activeDir={sortDir}
                    className="text-nowrap"
                  />
                </tr>
              </thead>
              <tbody>
                <FeedbackListRows
                  rows={rowsWithDetailHref}
                  canEdit={canEdit}
                  selectedId={detailRowId}
                />
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/** Human labels + “remove one filter” links (always resets to page 1). */
function buildActiveFilterChips(filterOnly: FeedbackListQuery): { key: string; label: string; clearHref: string }[] {
  const chips: { key: string; label: string; clearHref: string }[] = [];

  if (filterOnly.source) {
    const n = Number(filterOnly.source);
    chips.push({
      key: "source",
      label: `Source: ${FEEDBACK_SOURCE_LABELS[n] ?? filterOnly.source}`,
      clearHref: feedbackListHref({ ...filterOnly, source: undefined, page: 1 }),
    });
  }
  if (filterOnly.category) {
    const n = Number(filterOnly.category);
    chips.push({
      key: "category",
      label: `Category: ${FEEDBACK_CATEGORY_LABELS[n] ?? filterOnly.category}`,
      clearHref: feedbackListHref({ ...filterOnly, category: undefined, page: 1 }),
    });
  }
  if (filterOnly.priority) {
    const n = Number(filterOnly.priority);
    chips.push({
      key: "priority",
      label: `Priority: ${FEEDBACK_PRIORITY_LABELS[n] ?? filterOnly.priority}`,
      clearHref: feedbackListHref({ ...filterOnly, priority: undefined, page: 1 }),
    });
  }
  if (filterOnly.status) {
    const n = Number(filterOnly.status);
    chips.push({
      key: "status",
      label: `Status: ${FEEDBACK_STATUS_LABELS[n] ?? filterOnly.status}`,
      clearHref: feedbackListHref({ ...filterOnly, status: undefined, page: 1 }),
    });
  }
  if (filterOnly.ai === "pending") {
    chips.push({
      key: "ai",
      label: "AI: Pending",
      clearHref: feedbackListHref({ ...filterOnly, ai: undefined, page: 1 }),
    });
  } else if (filterOnly.ai === "processed") {
    chips.push({
      key: "ai",
      label: "AI: Processed",
      clearHref: feedbackListHref({ ...filterOnly, ai: undefined, page: 1 }),
    });
  }
  if (filterOnly.q && filterOnly.q.trim()) {
    const q = filterOnly.q.trim();
    chips.push({
      key: "q",
      label: `Search: "${q.length > 28 ? `${q.slice(0, 28)}…` : q}"`,
      clearHref: feedbackListHref({ ...filterOnly, q: undefined, page: 1 }),
    });
  }

  return chips;
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Record<number, string>;
}) {
  return (
    <div className="mb-0">
      <label htmlFor={`filter-${name}`} className="form-label small mb-1">
        {label}
      </label>
      <select name={name} id={`filter-${name}`} defaultValue={value ?? ""} className="form-select form-select-sm">
        <option value="">Any</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

function AiFilterSelect({ value }: { value?: string }) {
  const v = value === "pending" || value === "processed" ? value : "";
  return (
    <div className="mb-0">
      <label htmlFor="filter-ai" className="form-label small mb-1">
        AI processing
      </label>
      <select name="ai" id="filter-ai" defaultValue={v} className="form-select form-select-sm">
        <option value="">Any</option>
        <option value="pending">Pending (not processed)</option>
        <option value="processed">Processed</option>
      </select>
    </div>
  );
}

function BulkSelect({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: Record<number, string>;
}) {
  return (
    <div className="mb-0">
      <label htmlFor={`bulk-${name}`} className="form-label small mb-1 text-body-secondary">
        {label}
      </label>
      <select name={name} id={`bulk-${name}`} defaultValue="" className="form-select form-select-sm">
        <option value="">—</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
