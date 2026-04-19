---
name: ship-next-feature
description: >-
  Guides feature work in the Next.js 15 App Router app: React Server Components,
  route handlers, Auth.js-protected /app routes, Bootstrap + Tailwind styling,
  and server actions. Use when adding or changing dashboard, feedback,
  integrations, settings, onboarding, or pulse report UI under apps/web.
---

# Ship a Next.js feature (Kairos)

Kairos’s UI lives in **`apps/web`** (**Next.js 15**, **App Router**), with authenticated product pages under **`apps/web/src/app/app/`** (user-facing URLs under **`/app/...`**). Auth is **Auth.js** (see **`apps/web/src/auth.ts`**). Styling uses **Bootstrap / react-bootstrap** plus **Tailwind** where configured. Dev server defaults to port **3001** (see **`apps/web/package.json`**).

## When to use

- Adding or changing a screen behind login (dashboard, feedback, integrations, onboarding, settings, pulse reports, skills).
- Wiring new API routes under **`src/app/api/`** or server actions next to a feature.

## Steps

1. Locate the route segment under **`apps/web/src/app/app/`** (or add one). Session-backed JSON routes for the logged-in app live under **`apps/web/src/app/api/app/`** (e.g. **`feedbacks`**, **`reporting/ask`**), distinct from public **`api/v1/`** and **`api/webhooks/`**.
2. Prefer **server components** and **server actions** for data loading and mutations; keep shared DB access in **`packages/db`** via Drizzle.
3. Match existing layout, typography, and form patterns from neighboring pages.
4. For client-only behavior, add a small **`"use client"`** component; keep the route shell as a server component when possible.
5. After UI or behavior changes, run **`yarn workspace web lint`** and **`yarn test:web`** for affected areas.

## Notes

- Session and “current project” behavior: **`apps/web/src/app/app/layout.tsx`** and **`apps/web/src/lib/current-project.ts`** (httpOnly cookie; **`apps/web/src/app/app/set-project/route.ts`** updates it).
- Long-running or scheduled work belongs in **`apps/worker`**, not in route handlers — use **`bullmq-jobs-and-schedules`**.
