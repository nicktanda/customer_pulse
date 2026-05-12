# Skill: Ship Next Feature

This skill provides guidance for shipping a new product feature end-to-end in this repository.

## Process

1. **Plan** – Identify the minimal set of files to create or modify.
2. **Implement** – Write production-quality TypeScript/React code following repo conventions.
3. **Style** – Add component-scoped CSS; use CSS custom properties for theming.
4. **Test** – Co-locate `*.test.tsx` files with components.
5. **Flag** – Ship behind a feature flag (`NEXT_PUBLIC_FEATURE_*`) with A/B support.
6. **Review** – Run ESLint and TypeScript checks before opening a PR.

## Conventions

- Components live under `apps/web/src/app/components/`.
- Page-level sections live under `apps/web/src/app/<route>/`.
- CSS files live under `apps/web/src/app/styles/`.
- Feature flags live under `apps/web/src/app/<route>/` or a shared `lib/` directory.
- Use `"use client"` directive for components that read browser APIs.
- Avoid SSR/hydration mismatches by gating `localStorage` reads behind a `mounted` state.

## Accent Colour Feature (example)

The accent colour personalisation feature demonstrates the pattern:

```
apps/web/src/app/components/AccentColourPicker.tsx   ← core picker component
apps/web/src/app/components/AccentColourPicker.test.tsx
apps/web/src/app/styles/accent-colour-picker.css
apps/web/src/app/profile/AccentColourSection.tsx     ← profile page section
apps/web/src/app/profile/accent-colour-feature-flag.ts
```

- A single CSS custom property `--color-accent` is applied to `document.documentElement`.
- WCAG AA contrast is checked programmatically; a warning is shown for failing colours.
- Preference is stored in `localStorage` (and optionally persisted to the server via a callback).
- The flag is controlled by `NEXT_PUBLIC_FEATURE_ACCENT_COLOUR=true|false|ab`.
