/**
 * Query strings for `/app/integrations` (optional detail panel for one integration).
 */
export type IntegrationsListQuery = {
  detail?: number;
  /** Preserved from redirects (e.g. after “Sync all”). */
  notice?: string;
};

export function serializeIntegrationsListQuery(sp: IntegrationsListQuery): string {
  const qs = new URLSearchParams();
  if (sp.detail != null && Number.isFinite(sp.detail) && sp.detail > 0) {
    qs.set("detail", String(sp.detail));
  }
  if (sp.notice && sp.notice.trim()) {
    qs.set("notice", sp.notice.trim());
  }
  return qs.toString();
}

export function integrationsListHref(sp: IntegrationsListQuery): string {
  const s = serializeIntegrationsListQuery(sp);
  return s ? `/app/integrations?${s}` : "/app/integrations";
}
