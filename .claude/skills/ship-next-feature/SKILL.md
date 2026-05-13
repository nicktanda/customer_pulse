# Skill: Ship Next Feature

This skill covers the end-to-end process of shipping a new product feature in this repository.

## Checklist

1. **Feature flag** – wrap new surface area in `process.env.NEXT_PUBLIC_*` guards and add the variable to `.env.example` with a default of `false`.
2. **CSS tokens** – prefer `--css-custom-properties` over hard-coded hex values so theming and accent colours can be swapped via a single attribute on `<html>`.
3. **Component placement** – UI components live in `apps/web/src/components/`; shared logic/utilities live in `apps/web/src/lib/`.
4. **SSR safety** – guard `localStorage`/`document` access inside `useEffect` or utility helpers that check `typeof window !== 'undefined'`.
5. **Accessibility** – interactive colour swatches must use `role="radio"` + `aria-checked`, supply visible focus styles (`:focus-visible`), and maintain WCAG AA contrast (≥ 4.5:1).
6. **Dynamic imports** – client-only components that read browser APIs should be loaded with `next/dynamic` + `{ ssr: false }`.
7. **Persist user preferences** – use `localStorage` as a fast client-side fallback; propagate to the server profile via an `onChange` callback so both surfaces stay in sync.

## Example: Accent Colour Picker

The accent colour picker (`AccentColourPicker`, `AccentColourProvider`, `UserPreferencesAppearance`) follows this pattern:

- `apps/web/src/lib/accentColour.ts` – pure utility: palette definition, `applyAccentColour`, `persistAccentId`, `readPersistedAccentId`, feature-flag helper.
- `apps/web/src/components/AccentColourPicker.tsx` – headless swatch UI wired to the utilities above.
- `apps/web/src/components/AccentColourProvider.tsx` – zero-render provider dropped into the root layout to rehydrate the stored accent on every page load.
- `apps/web/src/components/UserPreferencesAppearance.tsx` – settings section wrapper; returns `null` when the feature flag is off.
- `.env.example` documents `NEXT_PUBLIC_ACCENT_COLOUR_PICKER=false`.
