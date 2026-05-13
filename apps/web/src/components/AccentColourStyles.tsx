'use client';

/**
 * Injects global CSS custom-property defaults and accent overrides.
 * Mount this once, high in the component tree (e.g. inside RootLayout).
 *
 * The CSS custom property --accent-colour is set dynamically by
 * applyAccentColour(); these rules ensure a sensible default and allow
 * any component to reference var(--accent-colour).
 */
export function AccentColourStyles() {
  const css = `
    :root {
      --accent-colour: #4F46E5;
    }

    /* Buttons and links that should follow the accent */
    [data-accent-ui] {
      background-color: var(--accent-colour) !important;
    }

    [data-accent-ui-outline] {
      border-color: var(--accent-colour) !important;
      color: var(--accent-colour) !important;
    }

    /* Focus rings respect the accent */
    [data-accent-ui]:focus-visible,
    [data-accent-ui-outline]:focus-visible {
      outline-color: var(--accent-colour) !important;
    }
  `;

  return (
    // eslint-disable-next-line react/no-danger
    <style dangerouslySetInnerHTML={{ __html: css }} />
  );
}
