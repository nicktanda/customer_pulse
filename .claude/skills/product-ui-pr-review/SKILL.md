---
name: product-ui-pr-review
description: >-
  Review or summarize user-visible changes for a PR: dashboard, onboarding, feedback
  UI, emails, and API error messages. Use when preparing release notes, reviewing UX
  copy, or checking accessibility basics before ship.
---

# Product UI and PR review checklist

Use this when a change touches **what users see** or **what integrators experience** (HTTP errors, email text, onboarding steps).

## When to use

- Before merging PRs that change **`apps/web/src/app/`** UI, mail-related copy, toast/error strings, or public API JSON errors.
- Writing **release notes** or a short **changelog** entry for stakeholders.

## Steps

1. Identify surfaces: **web UI** (authenticated **App Router** pages under **`/app/...`** in **`apps/web/src/app/app/`**), **emails**, **webhook/API** responses (**`api/webhooks/*`**, **`api/v1/*`**).
2. Check **copy clarity**: button labels, empty states, error strings — match tone with nearby views.
3. For **onboarding** (`/app/onboarding`), verify step order and failure messages when integrations fail.
4. For **accessibility basics**: focus order, form labels, meaningful link text — improve when trivial; flag larger gaps.
5. Summarize **user impact** in 3–5 bullets suitable for a PR description or release note.

## Notes

- This complements **`ship-next-feature`** (how to build) with **what to verify** before ship.
