/**
 * Query strings for `/app/pulse-reports` (pagination + optional detail panel).
 */
export type PulseReportsListQuery = {
  page?: number;
  detail?: number;
};

export function serializePulseReportsListQuery(sp: PulseReportsListQuery): string {
  const qs = new URLSearchParams();
  if (sp.page != null && sp.page > 1) {
    qs.set("page", String(sp.page));
  }
  if (sp.detail != null && Number.isFinite(sp.detail) && sp.detail > 0) {
    qs.set("detail", String(sp.detail));
  }
  return qs.toString();
}

export function pulseReportsListHref(sp: PulseReportsListQuery): string {
  const s = serializePulseReportsListQuery(sp);
  return s ? `/app/pulse-reports?${s}` : "/app/pulse-reports";
}
