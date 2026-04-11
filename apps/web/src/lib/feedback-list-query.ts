/**
 * Builds stable query strings for `/app/feedback` (filters, search, AI queue, pagination, sort).
 * Centralizes this so filter chips, pagination, and the filter form stay in sync.
 */

/** `received` maps to `created_at` on the server. */
export type FeedbackSortColumn = "received" | "title" | "id";

export type FeedbackListQuery = {
  source?: string;
  category?: string;
  priority?: string;
  status?: string;
  q?: string;
  ai?: string;
  page?: number;
  /** Open this feedback id in the list page’s right-hand detail panel (master–detail). */
  detail?: number;
  sort?: FeedbackSortColumn;
  dir?: "asc" | "desc";
};

/** Default direction per column when you first switch to that column (click header). */
export function defaultSortDir(sort: FeedbackSortColumn): "asc" | "desc" {
  return sort === "title" ? "asc" : "desc";
}

/**
 * Full sort state after applying URL defaults (missing `sort` / `dir` params).
 */
export function resolvedFeedbackListSort(sp: FeedbackListQuery): {
  sort: FeedbackSortColumn;
  dir: "asc" | "desc";
} {
  const sort: FeedbackSortColumn =
    sp.sort === "title" || sp.sort === "id" ? sp.sort : "received";
  const def = defaultSortDir(sort);
  const dir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : def;
  return { sort, dir };
}

/**
 * Only include `sort` / `dir` in the query object when they differ from the URL-default case
 * (`received` + `desc` means omit both).
 */
export function compactSortQueryFields(
  sort: FeedbackSortColumn,
  dir: "asc" | "desc",
): Pick<FeedbackListQuery, "sort" | "dir"> {
  const def = defaultSortDir(sort);
  if (sort === "received" && dir === "desc") {
    return {};
  }
  if (dir === def) {
    return { sort };
  }
  return { sort, dir };
}

export function parseFeedbackListSortFromParams(params: {
  sort?: string;
  dir?: string;
}): { sort: FeedbackSortColumn; dir: "asc" | "desc" } {
  const sort: FeedbackListQuery["sort"] =
    params.sort === "title" || params.sort === "id" || params.sort === "received"
      ? params.sort
      : undefined;
  return resolvedFeedbackListSort({
    sort,
    dir: params.dir === "asc" || params.dir === "desc" ? params.dir : undefined,
  });
}

/** Next URL when the user clicks a column header (toggle direction if same column). */
export function feedbackSortToggleHref(base: FeedbackListQuery, column: FeedbackSortColumn): string {
  const { sort, dir } = resolvedFeedbackListSort(base);
  let nextDir: "asc" | "desc";
  const nextSort = column;
  if (sort === column) {
    nextDir = dir === "asc" ? "desc" : "asc";
  } else {
    nextDir = defaultSortDir(column);
  }
  const { sort: s, dir: d } = compactSortQueryFields(nextSort, nextDir);
  return feedbackListHref({ ...base, sort: s, dir: d, page: 1 });
}

export function serializeFeedbackListQuery(sp: FeedbackListQuery): string {
  const qs = new URLSearchParams();
  if (sp.source) {
    qs.set("source", sp.source);
  }
  if (sp.category) {
    qs.set("category", sp.category);
  }
  if (sp.priority) {
    qs.set("priority", sp.priority);
  }
  if (sp.status) {
    qs.set("status", sp.status);
  }
  if (sp.q && sp.q.trim()) {
    qs.set("q", sp.q.trim());
  }
  if (sp.ai) {
    qs.set("ai", sp.ai);
  }
  if (sp.page != null && sp.page > 1) {
    qs.set("page", String(sp.page));
  }
  if (sp.detail != null && Number.isFinite(sp.detail) && sp.detail > 0) {
    qs.set("detail", String(sp.detail));
  }

  const { sort, dir } = resolvedFeedbackListSort(sp);
  const def = defaultSortDir(sort);
  if (sort !== "received") {
    qs.set("sort", sort);
  }
  if (dir !== def) {
    qs.set("dir", dir);
  }

  return qs.toString();
}

export function feedbackListHref(sp: FeedbackListQuery): string {
  const s = serializeFeedbackListQuery(sp);
  return s ? `/app/feedback?${s}` : "/app/feedback";
}
