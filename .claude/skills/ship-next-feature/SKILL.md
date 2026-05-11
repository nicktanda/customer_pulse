# Skill: Ship Next Feature

This skill documents patterns for shipping a self-contained UI feature in the Next.js app.

## Checklist

1. **Feature flag first** — wrap new functionality in a flag so it can be enabled per-account without a deploy.
2. **CSS custom properties** — expose a single `--color-*` variable at `:root`; let components consume it via `var(--color-accent, <fallback>)`.
3. **Accessibility** — run WCAG contrast checks programmatically before persisting user preferences.
4. **State management** — prefer a React context + custom hook pattern over global singletons.
5. **Persistence** — store preferences server-side (DB) with a localStorage fallback for unauthenticated guests.
6. **Tests** — unit-test pure utilities (contrast maths, validators) separately from React components.

## Accent Colour Feature Reference

Files introduced for the accent colour picker:

| File | Purpose |
|---|---|
| `apps/web/src/lib/accentColour.ts` | Pure utilities: palette, WCAG contrast, hex validation, CSS injection |
| `apps/web/src/hooks/useAccentColour.ts` | React hook: reads/writes localStorage + applies CSS custom property |
| `apps/web/src/components/AccentColourProvider.tsx` | Context provider; wraps the app (or settings page) |
| `apps/web/src/components/AccentColourPicker.tsx` | Palette swatches + free colour picker UI |
| `apps/web/src/components/AccentColourSettingsSection.tsx` | Full settings section wired to save callback |
| `apps/web/src/lib/accentColour.test.ts` | Unit tests for utilities |

## Usage

```tsx
// In your root layout or settings page:
import { AccentColourProvider } from '@/components/AccentColourProvider';

<AccentColourProvider initialValue={user?.accentColour} enabled={flags.accentColour}>
  {children}
</AccentColourProvider>

// In your settings page:
import { AccentColourSettingsSection } from '@/components/AccentColourSettingsSection';

<AccentColourSettingsSection
  onSave={async (hex) => {
    await updateUserPreference({ accentColour: hex });
  }}
  enabled={flags.accentColour}
/>
```

## CSS Integration

Add to your global stylesheet:

```css
:root {
  --color-accent: #6366f1;       /* default; overridden at runtime */
  --color-accent-fg: #ffffff;    /* foreground on accent background */
}

/* Primary buttons */
.btn-primary {
  background-color: var(--color-accent);
  color: var(--color-accent-fg);
}

/* Focus rings */
*:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Active nav items, highlights */
.nav-item[aria-current='page'] {
  border-left-color: var(--color-accent);
  color: var(--color-accent);
}
```
