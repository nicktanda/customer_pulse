import type { ReactNode } from "react";
import { BackLink } from "./BackLink";

type PageHeaderProps = {
  /** Main page title (semantic `<h1>`, styled like Bootstrap `h3`). */
  title: string;
  /** Optional subtitle / context under the title (text or inline links). */
  description?: ReactNode;
  /** When set, shows a back row above the title (parent list or detail page). */
  back?: { href: string; label: string };
  /** Right side on larger screens: primary actions like “Add integration”. */
  actions?: ReactNode;
  className?: string;
};

/**
 * One pattern for every screen: optional back link, title + description, optional actions.
 * Keeps spacing aligned so pages don’t each invent their own header block.
 */
export function PageHeader({ title, description, back, actions, className = "" }: PageHeaderProps) {
  return (
    <header className={`mb-4 ${className}`.trim()}>
      {back ? (
        <div className="mb-2">
          <BackLink href={back.href} label={back.label} />
        </div>
      ) : null}
      <div className="d-flex flex-column flex-md-row align-items-md-start justify-content-md-between gap-2">
        <div className="min-w-0">
          <h1 className="h3 text-body-emphasis mb-0">{title}</h1>
          {description ? (
            <p className="small text-body-secondary mt-1 mb-0">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="d-flex flex-shrink-0 flex-wrap gap-2 align-items-start">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
