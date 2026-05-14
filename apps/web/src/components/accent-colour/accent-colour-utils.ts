import { getAccentColour, DEFAULT_ACCENT_ID } from "./accent-colours";

/**
 * Reads the persisted accent colour from localStorage (fallback for
 * unauthenticated users or before the server preference is loaded).
 */
export function getStoredAccentColour(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT_ID;
  return localStorage.getItem("accent-colour") ?? DEFAULT_ACCENT_ID;
}

/**
 * Applies an accent colour by setting CSS custom properties on
 * the document root element and writing a data-attribute that
 * the stylesheet uses to scope the active palette.
 */
export function applyAccentColour(id: string): void {
  if (typeof document === "undefined") return;

  const colour = getAccentColour(id);
  const [h, s, l] = colour.value.split(" ");

  const root = document.documentElement;
  root.style.setProperty("--accent-h", h);
  root.style.setProperty("--accent-s", s);
  root.style.setProperty("--accent-l", l);
  root.setAttribute("data-accent", id);

  // Alias Bootstrap 5 / app-wide tokens so all existing components respond
  root.style.setProperty("--bs-primary", `hsl(${h} ${s} ${l})`);
  root.style.setProperty("--bs-primary-rgb", hslToRgbTriple(h, s, l));
  root.style.setProperty("--bs-link-color", `hsl(${h} ${s} ${l})`);
  root.style.setProperty(
    "--bs-link-hover-color",
    `hsl(${h} ${s} ${adjustLightness(l, -8)})`
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function adjustLightness(lStr: string, delta: number): string {
  const val = parseFloat(lStr);
  return `${Math.min(100, Math.max(0, val + delta))  }%`;
}

function hslToRgbTriple(hStr: string, sStr: string, lStr: string): string {
  const h = parseFloat(hStr) / 360;
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
}
