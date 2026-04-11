import Link from "next/link";

type BackLinkProps = {
  /** Where the user goes when they click (e.g. `/app/projects`). */
  href: string;
  /** Short label shown next to the chevron, e.g. "Projects" or "All feedback". */
  label: string;
  /** Extra Bootstrap or utility classes. */
  className?: string;
};

/**
 * Secondary navigation up one level. Uses an SVG chevron instead of a Unicode arrow
 * so it looks intentional and matches focus/hover styles in `globals.css` (`.app-back-link`).
 */
export function BackLink({ href, label, className = "" }: BackLinkProps) {
  // Screen readers get a full phrase; sighted users see chevron + short label.
  const ariaLabel = `Back to ${label}`;

  return (
    <Link
      href={href}
      className={`app-back-link ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {/* Simple left chevron; `currentColor` picks up text color from the link. */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="app-back-link__icon flex-shrink-0"
      >
        <path
          d="M10 12L6 8l4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
