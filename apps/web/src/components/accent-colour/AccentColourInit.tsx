/**
 * AccentColourInit — a server component that reads the persisted accent colour
 * from the request cookie and renders an inline <script> that applies it
 * synchronously before the first paint (no flash of default colour).
 *
 * Mount this inside your root <body> — before other children — in layout.tsx.
 *
 * Because it uses `cookies()` it must stay a Server Component (no "use client").
 */
import { cookies } from "next/headers";
import { ACCENT_COLOURS, ACCENT_COLOUR_STORAGE_KEY } from "./accent-colours";

export async function AccentColourInit() {
  const cookieStore = await cookies();
  const stored = cookieStore.get(ACCENT_COLOUR_STORAGE_KEY)?.value ?? "blue";
  const colour = ACCENT_COLOURS.find((c) => c.id === stored) ?? ACCENT_COLOURS[0];
  // Normalise whitespace before splitting
  const [h, s, l] = colour.value.trim().split(/\s+/);

  // Use JSON.stringify for defense-in-depth against any unexpected characters
  const hSafe = JSON.stringify(h);
  const sSafe = JSON.stringify(s);
  const lSafe = JSON.stringify(l);
  const idSafe = JSON.stringify(colour.id);

  // Inline script runs synchronously — no layout shift / flash
  const script = `
(function(){
  var h=${hSafe},s=${sSafe},l=${lSafe};
  var r=document.documentElement;
  r.style.setProperty('--accent-h',h);
  r.style.setProperty('--accent-s',s);
  r.style.setProperty('--accent-l',l);
  r.style.setProperty('--bs-primary','hsl('+h+' '+s+' '+l+')');
  r.style.setProperty('--bs-link-color','hsl('+h+' '+s+' '+l+')');
  r.setAttribute('data-accent',${idSafe});
})();
  `.trim();

  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
