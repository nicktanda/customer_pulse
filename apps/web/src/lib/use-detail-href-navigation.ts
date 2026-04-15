"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

/** Clicks on these inner targets should not navigate the row (links, controls). */
const DEFAULT_IGNORE_SELECTOR = "a, button, input, label";

/**
 * Factory for list / card rows that open a `?detail=` URL when the row is clicked or activated with Enter/Space.
 * Call the hook once per client list component, then `handlers(detailHref)` inside each row’s `map`.
 */
export function useDetailHrefNavigation() {
  const router = useRouter();

  return useCallback(
    (detailHref: string, options?: { ignoreSelector?: string }) => {
      const selector =
        options?.ignoreSelector != null && options.ignoreSelector.length > 0
          ? `${DEFAULT_IGNORE_SELECTOR}, ${options.ignoreSelector}`
          : DEFAULT_IGNORE_SELECTOR;

      const onClick = (e: MouseEvent<HTMLElement>) => {
        const el = e.target as HTMLElement;
        if (el.closest(selector)) return;
        router.push(detailHref);
      };

      const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const el = e.target as HTMLElement;
        if (el.closest(selector)) return;
        e.preventDefault();
        router.push(detailHref);
      };

      return { onClick, onKeyDown };
    },
    [router],
  );
}
