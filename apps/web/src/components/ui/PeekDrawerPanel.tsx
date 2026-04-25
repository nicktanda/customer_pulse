"use client";

/**
 * Resizable wrapper for the feedback peek/detail drawer panel.
 *
 * A thin drag handle sits on the left edge. The user can drag it left/right
 * to change the panel width. The chosen width is saved to localStorage so it
 * persists across page navigations.
 *
 * This is a client component because it needs mouse-event listeners and
 * localStorage. The children (header + body) are still server-rendered and
 * passed in as props.children.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "peek-drawer-width";

/** Clamp the panel width between a minimum and maximum (in px). */
const MIN_WIDTH = 280;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 420;

function readStoredWidth(storageKey: string): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const raw = localStorage.getItem(storageKey);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
}

export function PeekDrawerPanel({
  children,
  storageKey = STORAGE_KEY,
}: {
  children: React.ReactNode;
  /** localStorage key for persisting the chosen width. Override per-page to keep them independent. */
  storageKey?: string;
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  // After mount, read the persisted width so we avoid hydration mismatches
  // (server renders the default; client corrects it immediately).
  useEffect(() => {
    setWidth(readStoredWidth(storageKey));
  }, [storageKey]);

  // Keep a ref to the latest width AND storageKey so the mousemove handler
  // always sees the current values without re-subscribing.
  const widthRef = useRef(width);
  widthRef.current = width;
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  const dragging = useRef(false);
  // The X position of the pointer when the drag started.
  const dragStartX = useRef(0);
  // The panel width when the drag started.
  const dragStartWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // prevent text selection during drag
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = widthRef.current;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Moving the handle left (smaller clientX) makes the panel wider because
      // the panel is anchored to the right edge.
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Persist after the drag ends so we don't write on every pixel move.
      localStorage.setItem(storageKeyRef.current, String(widthRef.current));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <aside
      className="peek-drawer-panel"
      style={{ width }}
      aria-label="Detail panel"
    >
      {/* Drag handle — thin strip on the left edge */}
      <div
        className="peek-drawer-resize-handle"
        onMouseDown={onMouseDown}
        title="Drag to resize panel"
        aria-hidden // decorative; keyboard users don't need this
      />

      {children}
    </aside>
  );
}
