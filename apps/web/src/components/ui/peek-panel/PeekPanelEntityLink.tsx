import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Pill-shaped stable id (e.g. `#42`) linking to the canonical full-page record — same look everywhere.
 */
export function PeekPanelEntityLink({
  href,
  children,
  title: titleAttr,
}: {
  href: string;
  children: ReactNode;
  /** Optional tooltip; defaults to a generic “open full page” hint if you pass only id text */
  title?: string;
}) {
  return (
    <Link href={href} className="peek-panel-entity-link" title={titleAttr}>
      {children}
    </Link>
  );
}
