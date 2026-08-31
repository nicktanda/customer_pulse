"use client";

/**
 * "Add activity" menu for an insight's discovery workspace.
 *
 * We use react-bootstrap's Dropdown (not raw `data-bs-toggle`) because this app
 * imports Bootstrap CSS only — the official Bootstrap JS bundle is not loaded, so
 * HTML-only dropdowns never open. react-bootstrap implements toggle behavior in React.
 */

import Link from "next/link";
import { Dropdown } from "react-bootstrap";

const ACTIVITY_TYPES: { type: number; label: string; emoji: string }[] = [
  { type: 1, label: "Interview guide", emoji: "💬" },
  { type: 2, label: "Survey", emoji: "📋" },
  { type: 3, label: "Assumption map", emoji: "🗺" },
  { type: 4, label: "Competitor scan", emoji: "🔭" },
  { type: 5, label: "Data query", emoji: "📊" },
  { type: 6, label: "Desk research", emoji: "📚" },
  { type: 7, label: "Prototype hypothesis", emoji: "💡" },
];

export function AddActivityDropdown({ insightId }: { insightId: number }) {
  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="primary" size="sm" id={`add-activity-${insightId}`}>
        + Add activity
      </Dropdown.Toggle>
      <Dropdown.Menu className="shadow-sm">
        {ACTIVITY_TYPES.map(({ type, label, emoji }) => (
          <Dropdown.Item
            key={type}
            as={Link}
            href={`/app/discover/insights/${insightId}/new?type=${type}`}
          >
            {emoji} {label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
