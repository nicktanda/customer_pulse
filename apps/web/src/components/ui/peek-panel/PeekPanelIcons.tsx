/**
 * Stroke icons for master–detail “peek” panels (Notion-style bar).
 * All use currentColor; pair with aria-labels on the surrounding control.
 */
export const PEEK_PANEL_ICON_SIZE = 18;

type IconProps = {
  /** Pixel size; defaults to PEEK_PANEL_ICON_SIZE */
  size?: number;
};

/**
 * Double chevron right (») — dismiss / close the side panel.
 */
export function IconPeekClose({ size = PEEK_PANEL_ICON_SIZE }: IconProps) {
  return (
    <svg
      className="peek-panel-toolbar-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      <path
        d="M10 7l5 5-5 5M5 7l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * “Open full page” — square (document) with arrow out to the top-right; reads clearly at small sizes
 * (avoids the ambiguous diagonal double-arrow look).
 */
export function IconPeekOpenFull({ size = PEEK_PANEL_ICON_SIZE }: IconProps) {
  return (
    <svg
      className="peek-panel-toolbar-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      {/* Page outline */}
      <path
        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow into new window */}
      <path
        d="M15 3h6v6M10 14L21 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPeekChevronUp({ size = PEEK_PANEL_ICON_SIZE }: IconProps) {
  return (
    <svg
      className="peek-panel-toolbar-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      <path
        d="M7 14l5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPeekChevronDown({ size = PEEK_PANEL_ICON_SIZE }: IconProps) {
  return (
    <svg
      className="peek-panel-toolbar-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
