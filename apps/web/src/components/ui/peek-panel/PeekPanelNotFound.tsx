import Link from "next/link";

type PeekPanelNotFoundProps = {
  message: string;
  closeHref: string;
};

/**
 * Shown in StickyDetailAside when `?detail=` does not match a row in the current project.
 */
export function PeekPanelNotFound({ message, closeHref }: PeekPanelNotFoundProps) {
  return (
    <div className="card border-secondary-subtle shadow-sm">
      <div className="card-body">
        <p className="small text-body-secondary mb-2">{message}</p>
        <Link href={closeHref} className="btn btn-sm btn-outline-secondary">
          Close panel
        </Link>
      </div>
    </div>
  );
}
