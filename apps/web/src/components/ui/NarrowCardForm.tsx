import type { ReactNode } from "react";

type NarrowCardFormProps = {
  /**
   * When set, the outer element is `<form action={...}>`.
   * When omitted, renders a `<div>` with the same card look (e.g. onboarding content shell).
   */
  action?: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  /** Appended to `card shadow-sm border-secondary-subtle` — e.g. `mt-4` below `PageHeader` / `InlineAlert`. */
  className?: string;
  /** Default stacks labeled fields; use `""` for a plain `card-body` (wider layouts). */
  bodyClassName?: string;
};

/**
 * Standard “narrow page” card: shadow, subtle border, padded body.
 * Keeps new/edit flows visually aligned across Projects, Recipients, Integrations, etc.
 */
export function NarrowCardForm({
  action,
  children,
  className = "",
  bodyClassName = "d-flex flex-column gap-3",
}: NarrowCardFormProps) {
  const shell = `card shadow-sm border-secondary-subtle ${className}`.trim();
  const bodyClasses = ["card-body", bodyClassName].filter(Boolean).join(" ").trim();
  const inner = <div className={bodyClasses}>{children}</div>;

  if (action) {
    return (
      <form action={action} className={shell}>
        {inner}
      </form>
    );
  }

  return <div className={shell}>{inner}</div>;
}
