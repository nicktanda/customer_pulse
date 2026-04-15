import type { ReactNode } from "react";

type FormActionsProps = {
  children: ReactNode;
  /** `start` = natural reading order (common for wizards); `end` = push actions right. */
  align?: "start" | "end";
  /** `bordered` adds a top rule (good after fields); `plain` fits flush inside a card body. */
  variant?: "bordered" | "plain";
  className?: string;
};

/**
 * Bottom row of a form: consistent gap and alignment for Cancel / Submit / Skip buttons.
 */
export function FormActions({
  children,
  align = "start",
  variant = "bordered",
  className = "",
}: FormActionsProps) {
  const justify = align === "end" ? "justify-content-end" : "";
  const shell =
    variant === "plain"
      ? `d-flex flex-wrap gap-2 ${justify} ${className}`.trim()
      : `d-flex flex-wrap gap-2 pt-3 mt-2 border-top border-secondary-subtle ${justify} ${className}`.trim();
  return <div className={shell}>{children}</div>;
}
