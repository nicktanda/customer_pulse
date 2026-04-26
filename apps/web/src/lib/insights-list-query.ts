/**
 * Query strings for `/app/learn/insights` (pagination + optional right-hand detail panel).
 */
export type InsightsListQuery = {
  page?: number;
  detail?: number;
};

export function serializeInsightsListQuery(sp: InsightsListQuery): string {
  const qs = new URLSearchParams();
  if (sp.page != null && sp.page > 1) {
    qs.set("page", String(sp.page));
  }
  if (sp.detail != null && Number.isFinite(sp.detail) && sp.detail > 0) {
    qs.set("detail", String(sp.detail));
  }
  return qs.toString();
}

export function insightsListHref(sp: InsightsListQuery): string {
  const s = serializeInsightsListQuery(sp);
  return s ? `/app/learn/insights?${s}` : "/app/learn/insights";
}
