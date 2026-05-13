/**
 * Injects global CSS custom-property defaults and accent overrides.
 * Mount this once, high in the component tree (e.g. inside RootLayout <head>).
 *
 * The CSS custom property --accent-colour is set dynamically by
 * applyAccentColour(); these rules ensure a sensible default and allow
 * any component to reference var(--accent-colour).
 *
 * This is a Server Component — no 'use client' directive — so it renders
 * to a plain <style> tag without hydration concerns.
 */
export function AccentColourStyles() {
  const css = [
    ':root {',
    '  --accent-colour: #4F46E5;',
    '}',
    '',
    '/* Buttons and links that should follow the accent */',
    '[data-accent-ui] {',
    '  background-color: var(--accent-colour);',
    '}',
    '',
    '[data-accent-ui-outline] {',
    '  border-color: var(--accent-colour);',
    '  color: var(--accent-colour);',
    '}',
    '',
    '/* Focus rings respect the accent */',
    '[data-accent-ui]:focus-visible,',
    '[data-accent-ui-outline]:focus-visible {',
    '  outline-color: var(--accent-colour);',
    '}',
  ].join('\n');

  return (
    // eslint-disable-next-line react/no-danger
    <style dangerouslySetInnerHTML={{ __html: css }} />
  );
}
