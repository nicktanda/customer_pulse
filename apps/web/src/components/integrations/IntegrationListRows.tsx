"use client";

/**
 * Integration list: entire row opens `?detail=id` (title link still works for middle-click).
 */
import Link from "next/link";
import {
  MessageSquare,   // Slack
  Layers,          // Linear
  Kanban,          // Jira
  ClipboardList,   // Google Forms
  Code2,           // Custom API
  Phone,           // Gong
  Table,           // Excel Online
  Monitor,         // LogRocket
  Video,           // FullStory
  MessagesSquare,  // Intercom
  AlertTriangle,   // Sentry
  Headphones,      // Zendesk
  GitBranch,       // GitHub
  Sparkles,        // Anthropic
  PlugZap,         // fallback
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { INTEGRATION_SOURCE_LABELS } from "@/lib/integration-source-meta";
import { formatAppDateTime } from "@/lib/format-app-date";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";

/**
 * Maps `sourceType` integer values (from `INTEGRATION_SOURCE_LABELS`) to a Lucide icon.
 * Integers come from `IntegrationSourceType` in packages/db — kept in sync with
 * integration-source-meta.ts which defines: 0=Linear, 1=Google Forms, 2=Slack,
 * 3=Custom API, 4=Gong, 5=Excel Online, 6=Jira, 7=LogRocket, 8=FullStory,
 * 9=Intercom, 10=Zendesk, 11=Sentry, 12=GitHub (fallback)
 */
const SOURCE_ICONS: Record<number, LucideIcon> = {
  0: Layers,         // Linear
  1: ClipboardList,  // Google Forms
  2: MessageSquare,  // Slack
  3: Code2,          // Custom API
  4: Phone,          // Gong
  5: Table,          // Excel Online
  6: Kanban,         // Jira
  7: Monitor,        // LogRocket
  8: Video,          // FullStory
  9: MessagesSquare, // Intercom
  10: Headphones,    // Zendesk
  11: AlertTriangle, // Sentry
  12: GitBranch,     // GitHub
  13: Sparkles,      // Anthropic
};

export type IntegrationListRow = {
  id: number;
  name: string;
  sourceType: number;
  enabled: boolean;
  lastSyncedAt: Date | null;
  /** Built on the server — Client Components cannot receive function props from Server Components. */
  detailHref: string;
};

export function IntegrationListRows({
  rows,
  selectedId,
}: {
  rows: IntegrationListRow[];
  selectedId: number | null;
}) {
  const handlersFor = useDetailHrefNavigation();

  return (
    <>
      {rows.map((r) => {
        const href = r.detailHref;
        const isSelected = selectedId === r.id;
        const { onClick, onKeyDown } = handlersFor(href);
        // Pick the matching icon or fall back to PlugZap for unknown source types
        const Icon: LucideIcon = SOURCE_ICONS[r.sourceType] ?? PlugZap;
        const sourceLabel = INTEGRATION_SOURCE_LABELS[r.sourceType] ?? `Type ${r.sourceType}`;

        return (
          <li
            key={r.id}
            tabIndex={0}
            className={`list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 py-3 px-3 app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            {/* Source icon circle: ember-tinted background + ember icon */}
            <div className="d-flex align-items-center gap-3 flex-grow-1 min-w-0">
              <div
                aria-hidden="true"
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  background: "rgba(var(--bs-primary-rgb), 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} style={{ color: "var(--bs-primary)" }} />
              </div>

              {/* Name + source type label */}
              <div className="min-w-0">
                <Link href={href} className="fw-semibold link-primary text-decoration-none d-block text-truncate">
                  {r.name}
                </Link>
                <p className="small text-body-secondary mb-0">
                  {sourceLabel}
                  {r.lastSyncedAt ? ` · last sync ${formatAppDateTime(r.lastSyncedAt)}` : ""}
                </p>
              </div>
            </div>

            {/* Status badge: Bootstrap semantic colours (green = enabled, grey = disabled) */}
            {r.enabled ? (
              <span className="badge text-bg-success">Enabled</span>
            ) : (
              <span className="badge text-bg-secondary">Disabled</span>
            )}
          </li>
        );
      })}
    </>
  );
}
