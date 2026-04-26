"use client";

import { useRouter } from "next/navigation";

export type InsightOption = { id: number; title: string };

type Props = {
  insights: InsightOption[];
  /** Selected insight id as string, or "" for none */
  value: string;
};

/**
 * Client-side insight selector for /app/discover — updates the URL so the server can render
 * the four discovery tools for the chosen insight without a full page reload beyond RSC refresh.
 */
export function DiscoverInsightPicker({ insights, value }: Props) {
  const router = useRouter();

  return (
    <div className="mb-4">
      <label htmlFor="discover-insight-picker" className="form-label small fw-semibold text-body-emphasis">
        Which insight are you validating?
      </label>
      <select
        id="discover-insight-picker"
        className="form-select"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) {
            router.push("/app/discover");
          } else {
            router.push(`/app/discover?insight=${encodeURIComponent(v)}`);
          }
        }}
      >
        <option value="">Choose an insight…</option>
        {insights.map((i) => (
          <option key={i.id} value={String(i.id)}>
            {i.title}
          </option>
        ))}
      </select>
      <p className="small text-body-secondary mt-2 mb-0">
        All four tools below use this insight&apos;s title and description when you run <strong>Draft with AI</strong>.
      </p>
    </div>
  );
}
