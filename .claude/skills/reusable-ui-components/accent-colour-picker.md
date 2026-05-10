# Skill: User-Selectable Accent / Highlight Colour

## Overview

Allow users to pick a single accent colour (used for highlights, buttons, and active states) from a constrained palette or a free colour picker in their profile settings. The rest of the UI remains unchanged, minimising regression risk.

---

## Goals

- Expose `--color-accent` as a single CSS custom property and apply it consistently to highlights, focus rings, and primary buttons.
- Offer a curated palette of 8–12 accessible colours as quick-pick swatches, plus an advanced free-pick `<input type="color">`.
- Validate contrast ratio programmatically and warn the user if their chosen colour fails WCAG AA against the background.
- Store preference per user account; fall back to the default brand colour if unset.
- Ship behind a feature flag so uptake can be A/B tested before full rollout.

---

## Implementation Plan

### 1. CSS Custom Property

In the global stylesheet (`apps/web/src/styles/globals.css` or equivalent) define the CSS variable with a sensible default:

```css
:root {
  --color-accent: #6366f1; /* default brand indigo */
}

/* Apply to interactive elements */
.btn-primary {
  background-color: var(--color-accent);
}

a:focus-visible,
[data-focus-ring] {
  outline-color: var(--color-accent);
}

.highlight {
  color: var(--color-accent);
}
```

Apply the user's stored value at the document root via an inline style or a small script in `_app.tsx` / the root layout:

```tsx
// In the root layout or _app.tsx, after the user preference is loaded:
document.documentElement.style.setProperty('--color-accent', userAccentColour);
```

---

### 2. Curated Palette

Define the palette in a shared constants file (`apps/web/src/lib/accentPalette.ts`):

```ts
export const ACCENT_PALETTE = [
  { label: 'Indigo',   hex: '#6366f1' },
  { label: 'Violet',   hex: '#8b5cf6' },
  { label: 'Sky',      hex: '#0ea5e9' },
  { label: 'Teal',     hex: '#14b8a6' },
  { label: 'Emerald',  hex: '#10b981' },
  { label: 'Rose',     hex: '#f43f5e' },
  { label: 'Orange',   hex: '#f97316' },
  { label: 'Amber',    hex: '#f59e0b' },
  { label: 'Slate',    hex: '#475569' },
];

export const DEFAULT_ACCENT = ACCENT_PALETTE[0].hex;
```

---

### 3. Contrast Validation Utility

Create `apps/web/src/lib/contrastCheck.ts`:

```ts
/**
 * Returns the relative luminance of an sRGB hex colour.
 * Formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const linearise = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/**
 * Returns the WCAG contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA requires 4.5:1 for normal text, 3:1 for large / UI components. */
export function passesWcagAA(accentHex: string, backgroundHex = '#ffffff'): boolean {
  return contrastRatio(accentHex, backgroundHex) >= 3;
}
```

---

### 4. AccentColourPicker Component

Create `apps/web/src/components/AccentColourPicker.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { ACCENT_PALETTE, DEFAULT_ACCENT } from '@/lib/accentPalette';
import { passesWcagAA } from '@/lib/contrastCheck';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export function AccentColourPicker({ value, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const contrastOk = passesWcagAA(value);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Accent colour</p>

      {/* Curated swatches */}
      <div className="flex flex-wrap gap-2">
        {ACCENT_PALETTE.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            title={swatch.label}
            aria-label={`Select ${swatch.label}`}
            aria-pressed={value === swatch.hex}
            onClick={() => onChange(swatch.hex)}
            className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 ${
              value === swatch.hex
                ? 'border-gray-900 scale-110'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: swatch.hex }}
          />
        ))}
      </div>

      {/* Advanced free-pick */}
      <button
        type="button"
        className="text-xs text-gray-500 underline hover:text-gray-700"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? 'Hide advanced' : 'Choose custom colour…'}
      </button>

      {showAdvanced && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border border-gray-300"
          />
          <span className="text-sm text-gray-600 font-mono">{value.toUpperCase()}</span>
        </div>
      )}

      {/* Contrast warning */}
      {!contrastOk && (
        <p className="text-xs text-amber-600" role="alert">
          ⚠ This colour may have insufficient contrast against white backgrounds
          (WCAG AA requires a 3:1 ratio for UI components).
        </p>
      )}

      {/* Live preview */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          className="rounded px-4 py-1.5 text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: value }}
        >
          Preview button
        </button>
        <span
          className="text-sm font-medium"
          style={{ color: value }}
        >
          Highlighted text
        </span>
      </div>
    </div>
  );
}
```

---

### 5. Feature Flag

Gate the picker behind a feature flag so it can be enabled for a subset of users:

```ts
// apps/web/src/lib/featureFlags.ts  (add to existing file or create)
export const FEATURE_FLAGS = {
  accentColourPicker: process.env.NEXT_PUBLIC_FEATURE_ACCENT_COLOUR === 'true',
} as const;
```

In `.env.example`:
```
NEXT_PUBLIC_FEATURE_ACCENT_COLOUR=false
```

In the profile settings page:
```tsx
import { FEATURE_FLAGS } from '@/lib/featureFlags';

{FEATURE_FLAGS.accentColourPicker && (
  <AccentColourPicker value={accentColour} onChange={handleAccentChange} />
)}
```

---

### 6. Persistence

#### Database

Add a nullable `accent_colour` column to the users table via a Drizzle migration:

```ts
// packages/db/src/schema.ts — add to existing users table definition
accentColour: text('accent_colour'),
```

Create a migration in `drizzle/meta/` or via `drizzle-kit generate`:

```sql
ALTER TABLE users ADD COLUMN accent_colour text;
```

#### API

Add a `PATCH /api/user/preferences` route (or extend the existing profile update endpoint) that accepts `{ accentColour: string }`, validates it is a valid 6-digit hex, and persists it.

#### Client

```ts
async function saveAccentColour(hex: string) {
  await fetch('/api/user/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accentColour: hex }),
  });
}
```

#### Applying on Load

In the root layout (server component) or a client provider, read the stored value and emit an inline style:

```tsx
// Server component (root layout)
<html style={`--color-accent: ${user?.accentColour ?? DEFAULT_ACCENT}`}>
```

Or in a client provider after hydration:

```ts
useEffect(() => {
  const colour = user?.accentColour ?? DEFAULT_ACCENT;
  document.documentElement.style.setProperty('--color-accent', colour);
}, [user?.accentColour]);
```

---

## Testing Checklist

- [ ] Default colour renders correctly when no preference is stored.
- [ ] Selecting a swatch updates the preview immediately.
- [ ] Free colour picker updates `--color-accent` live.
- [ ] Contrast warning appears for low-contrast colours and is absent for accessible ones.
- [ ] Preference is persisted after page reload.
- [ ] Feature flag hides the picker when `NEXT_PUBLIC_FEATURE_ACCENT_COLOUR=false`.
- [ ] `contrastRatio` utility returns correct values for known pairs (e.g. black on white ≈ 21:1).
- [ ] No visual regression on primary buttons, links, and focus rings.

---

## A/B Testing Notes

- Enable for a random 50 % of new users by toggling the flag at the session/user level rather than build time.
- Track: feature discovery rate, picker interaction rate, and colour save rate.
- Success metric: users who customise their accent colour show higher 7-day retention.
- Roll out to 100 % if retention delta is statistically significant at p < 0.05 after 4 weeks.

---

## Accessibility Notes

- Always keep text rendered *over* the accent colour in white (`#ffffff`) or near-black (`#1a1a1a`) — chosen dynamically based on contrast.
- Swatches include `aria-label` and `aria-pressed` for keyboard and screen-reader support.
- Focus ring uses `--color-accent` with sufficient contrast via `focus-visible` (not `focus`) to avoid annoying mouse users.
- Document the WCAG AA threshold in code comments so future contributors know why the 3:1 ratio is used.
