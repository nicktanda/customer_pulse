---
name: Remove Skills + Verify Onboarding
overview: Remove the Next.js `/app/skills` feature (routes, server actions, filesystem sync helper) and dead `repo-root` code; keep the Postgres `skills` table for legacy data. Verify onboarding via automated checks plus a short manual QA path, fixing any concrete bugs found.
todos:
  - id: delete-skills-ui
    content: Delete apps/web/src/app/app/skills/*, remove nav link in app/app/layout.tsx, delete apps/web/src/lib/repo-root.ts
    status: completed
  - id: automated-verify
    content: Run yarn workspace web lint, yarn test, yarn build:web
    status: completed
  - id: manual-onboarding
    content: "Manual QA: incomplete vs complete user redirects; step advance; error query params"
    status: completed
  - id: fix-onboarding-if-needed
    content: If QA/automation fails, patch onboarding/middleware with minimal fix
    status: completed
isProject: false
---

# Remove skills UI and verify onboarding

## 1. Remove the Skills page and related code

**Delete the route tree** under [`apps/web/src/app/app/skills/`](apps/web/src/app/app/skills/) (index, `new/`, `[id]/edit/`, `actions.ts`, `DeleteSkillButton.tsx`, `skill-files.ts`).

**Remove the sidebar link** in [`apps/web/src/app/app/layout.tsx`](apps/web/src/app/app/layout.tsx) (the `nav` entry with `href: "/app/skills"`).

**Delete dead helper** [`apps/web/src/lib/repo-root.ts`](apps/web/src/lib/repo-root.ts) — it is only imported by `skill-files.ts` (confirmed via repo-wide grep).

**Leave the database as-is:** the [`skills`](packages/db/src/schema.ts) table and `usersRelations.skills` stay in [`packages/db/src/schema.ts`](packages/db/src/schema.ts). Dropping the table would require a migration and data decision; the UI removal does not require it. No worker code references `skills`.

**Optional cleanup (only if you want docs aligned):** [`docs/next-migration/PARITY_MATRIX.md`](docs/next-migration/PARITY_MATRIX.md) still lists `/app/skills` — update or remove that row when convenient (not required for the app to build).

**Do not remove:** `.claude/skills/*/SKILL.md` (Claude Code instructions) or `yarn document-skills` — those are unrelated to the removed **in-app** CRUD.

---

## 2. How onboarding is supposed to work (baseline for verification)

```mermaid
flowchart TD
  MW[middleware sets x-pathname]
  L[app/app/layout.tsx]
  O[/app/onboarding page]
  A[onboarding actions]
  MW --> L
  L -->|"onboarding incomplete and not on wizard"| O
  L -->|"onboarding complete"| App[/app dashboard etc/]
  O --> A
  A -->|"updates users.onboarding_current_step"| O
  A -->|"sets onboarding_completed_at"| App
```

- **Gating:** [`apps/web/src/app/app/layout.tsx`](apps/web/src/app/app/layout.tsx) redirects users without `onboarding_completed_at` to `/app/onboarding`, except when `x-pathname` starts with `/app/onboarding` (header set in [`apps/web/src/middleware.ts`](apps/web/src/middleware.ts), matcher `/app/:path*`).
- **Wizard UI + errors:** [`apps/web/src/app/app/onboarding/page.tsx`](apps/web/src/app/app/onboarding/page.tsx) reads `onboarding_current_step` (defaults to `"welcome"` when null) and `searchParams.error`.
- **Progress:** [`apps/web/src/app/app/onboarding/actions.ts`](apps/web/src/app/app/onboarding/actions.ts) advances steps, creates/updates project + cookie, optional integrations/recipients, and completes onboarding.

---

## 3. Verification steps (after code changes)

**Automated (run from repo root):**

- `yarn workspace web lint`
- `yarn test` (includes web + db vitest and worker `tsc`)
- `yarn build:web` (catches missing imports after deleting skills files)

**Manual QA (you already run `yarn dev` — refresh after changes):**

1. **Incomplete user:** In Postgres, set `onboarding_completed_at` to `NULL` and `onboarding_current_step` to `'welcome'` for your test user. Visit `/app` — expect redirect to `/app/onboarding`.
2. **Wizard:** Advance at least through **project** (name required) and confirm you land on the next step without a redirect loop.
3. **Complete user:** Finish the wizard (or set `onboarding_completed_at` to a timestamp). Visit `/app/onboarding` — expect redirect to `/app` ([`page.tsx` lines 23–25](apps/web/src/app/app/onboarding/page.tsx)).
4. **Error paths:** Trigger `?error=project_name` (empty project submit) and confirm the red alert appears.

If any step fails (e.g. infinite redirect, 500 on `skills` query — should be gone after removal, or DB missing columns), capture the server error from the terminal and fix the specific cause (e.g. migration, env, or a small code fix in onboarding).

---

## 4. Onboarding fixes only if verification finds a bug

No change is assumed necessary until the checks above run. If something is broken, likely places to patch:

- Middleware matcher / header not applied for a given `/app` path.
- `onboarding_current_step` out of sync with posted `_onboarding_step` (strict check in [`actions.ts` lines 31–34](apps/web/src/app/app/onboarding/actions.ts)).
- Missing DB columns/tables for `users`, `projects`, `project_users`, etc.

Those would be addressed with minimal, targeted edits in the same change set once the failure is known.
