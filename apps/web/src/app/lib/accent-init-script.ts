import { ACCENT_COLOURS, DEFAULT_ACCENT_KEY } from "@/components/ui/accentColours";

/**
 * Returns an inline script string that can be injected into <head> to set
 * accent CSS variables before React hydrates (prevents FOUC).
 * Both ACCENT_COLOURS and DEFAULT_ACCENT_KEY are build-time constants from
 * the local TypeScript file — no user-controlled input flows through here,
 * so embedding them via dangerouslySetInnerHTML is safe.
 * This module has NO "use client" directive so it can be imported by server components.
 */
export function getAccentInitScript(): string {
  const colours = JSON.stringify(ACCENT_COLOURS);
  const defaultKey = DEFAULT_ACCENT_KEY;
  return `
(function(){
  try {
    var colours = ${colours};
    var key = localStorage.getItem('accentColour') || '${defaultKey}';
    if (!colours[key]) key = '${defaultKey}';
    var c = colours[key];
    var r = document.documentElement;
    r.setAttribute('data-accent', key);
    r.style.setProperty('--accent-colour', c.value);
    r.style.setProperty('--accent-colour-hover', c.hover);
    r.style.setProperty('--accent-colour-subtle', c.subtle);
    r.style.setProperty('--accent-colour-foreground', c.foreground);
  } catch(e) {}
})();
  `.trim();
}
