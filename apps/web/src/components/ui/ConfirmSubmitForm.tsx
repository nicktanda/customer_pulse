"use client";

import type { ReactNode } from "react";

type ConfirmSubmitFormProps = {
  /** Shown in the browser confirm() dialog before the server action runs. */
  message: string;
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
};

/**
 * Wraps a form with a server action so destructive submits ask for confirmation first.
 */
export function ConfirmSubmitForm({ message, action, children, className }: ConfirmSubmitFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (typeof window !== "undefined" && !window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
