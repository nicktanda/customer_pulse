---
name: public-api-feedback
description: >-
  Design or change the public HTTP API for submitting feedback (/api/v1/feedback),
  including authentication, validation, and compatibility with external clients.
  Use when editing the Next.js route handler or related DB helpers.
---

# Public API — feedback ingestion

The app exposes **`POST /api/v1/feedback`** via the **Next.js** route module **`apps/web/src/app/api/v1/feedback/route.ts`**. Changes can break external integrations; treat the contract as a product surface.

## When to use

- Changing the route handler, Zod (or other) validation, or API-key lookup.
- Adjusting required fields, response codes, or error JSON shape.
- Adding or updating Vitest coverage under **`apps/web`** for this route.

## Steps

1. Read the route handler and any existing tests that cover **`/api/v1/feedback`**.
2. Keep responses predictable: clear **HTTP status**, JSON error bodies, and stable field names.
3. Ensure authentication matches product intent (API keys, rate limits if any).
4. Update **`README.md`** or customer-facing docs if the public contract changes (**`customer-documentation`**).
5. Run **`yarn test:web`** after edits.

## Notes

- Coordinate with **webhooks** and **integrations** skills if the same domain entities are affected.
- Never commit real API keys; use **`.env.example`** for variable names only.
