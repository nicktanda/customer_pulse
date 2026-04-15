"use client";

/**
 * Project cards on `/app/projects`: click the card to open `?detail=id`.
 */
import Link from "next/link";
import { useDetailHrefNavigation } from "@/lib/use-detail-href-navigation";

export type ProjectCardRow = {
  id: number;
  name: string;
  slug: string;
  isOwner: boolean;
  /** Built on the server — Client Components cannot receive function props from Server Components. */
  detailHref: string;
};

export function ProjectListCards({
  rows,
  selectedId,
}: {
  rows: ProjectCardRow[];
  selectedId: number | null;
}) {
  const handlersFor = useDetailHrefNavigation();

  return (
    <>
      {rows.map((p) => {
        const href = p.detailHref;
        const isSelected = selectedId === p.id;
        const { onClick, onKeyDown } = handlersFor(href);
        return (
          <li key={p.id}>
            <article
              tabIndex={0}
              className={`card border-secondary-subtle shadow-sm app-clickable-list-row${isSelected ? " app-list-row-selected" : ""}`}
              onClick={onClick}
              onKeyDown={onKeyDown}
            >
              <div className="card-body py-3">
                <Link href={href} className="fw-medium link-primary text-decoration-none">
                  {p.name}
                </Link>
                <span className="small text-body-secondary ms-2">{p.slug}</span>
                {p.isOwner ? <span className="badge text-bg-secondary ms-2">owner</span> : null}
              </div>
            </article>
          </li>
        );
      })}
    </>
  );
}
