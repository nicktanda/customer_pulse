# Multi-User Plan — Team Members, My Work, and Team Assignments

> Feature spec for adding real users to the app, assigning them to teams in Strategy,
> and giving every member a personal "My Work" dashboard.
> Generated: Sat 25 Apr 2026

---

## What this is

Right now Customer Pulse is effectively single-user inside a project.
`project_users` exists in the schema and there is access-control logic
(`userCanEditProject`, `userHasProjectAccess`), but there is no way to:

- **Invite** another person to a project
- **Assign** them to a team in Strategy
- See what work is **mine vs. someone else's** across Discovery, Build, and Monitor

This plan adds all three of those things in three focused phases.

---

## What already exists (don't rebuild these)

| Piece | Status | Notes |
|-------|--------|-------|
| `project_users` table | ✅ Exists | `is_owner`, `invited_by_id`, FK to users + projects |
| `users` table | ✅ Exists | `name`, `email`, `avatar_url`, `role` |
| `teams` table | ✅ Exists | `name`, `objectives`, `strategy` — but no member column |
| `userHasProjectAccess()` | ✅ Exists | Used in every page already |
| `userCanEditProject()` | ✅ Exists | Owner-only edit gate |
| `getCurrentProjectIdForUser()` | ✅ Exists | Used for project scoping |
| Strategy page team UI | ✅ Exists | Create / edit / delete — just missing member list |

---

## Database changes

### Phase 1 additions

#### New column on `teams`: `member_user_ids`

The simplest approach for v1 is a **JSON array of user IDs** on the team row.
This avoids a join table for the first version and keeps the migration trivial.

```sql
ALTER TABLE teams ADD COLUMN member_user_ids jsonb NOT NULL DEFAULT '[]';
```

In Drizzle (`packages/db/src/schema.ts`):

```ts
memberUserIds: jsonb("member_user_ids")
  .$type<number[]>()
  .notNull()
  .default([]),
```

> **Why not a join table?**
> Teams are small (2–10 people) and the only query is "who is in this team?"
> A JSON column is enough for v1 and avoids a migration + query-join overhead.
> We can promote it to `team_members` later if we need per-member roles or
> history.

#### New columns on `specs` for assignee

```sql
ALTER TABLE specs ADD COLUMN assigned_user_id bigint REFERENCES users(id) ON DELETE SET NULL;
```

In Drizzle:

```ts
assignedUserId: bigint("assigned_user_id", { mode: "number" }),
```

#### New columns on discovery `activities` for assignee

The `discovery_activities` table (added in the Discovery plan) should also get:

```sql
ALTER TABLE discovery_activities ADD COLUMN assigned_user_id bigint REFERENCES users(id) ON DELETE SET NULL;
```

---

### Phase 2 additions

#### `project_invitations` table (new)

We need a way for an owner to invite someone who does not have a user account yet
(or who has an account but is not in the project).

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial PK | |
| `project_id` | bigint FK → projects | |
| `invited_by_id` | bigint FK → users | The owner who sent the invite |
| `email` | varchar(255) | Invitee address — may not have a user row yet |
| `token` | varchar(255) | Unique random token for the accept link |
| `accepted_at` | timestamptz nullable | Set when the invitee clicks accept |
| `expires_at` | timestamptz | Default: 7 days from created_at |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Unique index on `(project_id, email)` to prevent duplicate invites.

---

## Feature areas

---

### Feature 1 — Invite members to a project

**Where:** New sub-page at `/app/settings/members` (or a members section in
the existing project settings page).

**Who can do it:** Only owners (`is_owner = true` in `project_users`).

**Flow:**

1. Owner opens the Members page and sees a list of current project members.
2. Owner types an email address and clicks "Send invite".
3. The server action:
   - Creates a `project_invitations` row with a random token and a 7-day expiry.
   - Sends an email to the invitee with a link like `/accept-invite?token=abc123`.
4. The invitee clicks the link:
   - If they have an account → they are added to `project_users` and redirected
     to the app.
   - If they don't have an account → they land on a sign-up page pre-filled with
     their email, then get added to the project after they register.
5. A confirmation banner shows on the Members page: "Invite sent to
   name@example.com".

**Member list UI (Members page):**

Each member row shows:
- Avatar (initials circle if no `avatar_url`)
- Name + email
- "Owner" badge if `is_owner`
- "Remove" button (owner only, cannot remove yourself if you're the only owner)

**Pending invites section:**
- Shows email + "Sent X days ago" + "Revoke" button.
- Expired invites show a red "Expired" badge and a "Resend" button.

---

### Feature 2 — Assign users to teams in Strategy

**Where:** Strategy page (`/app/strategy`) — inside each team card.

**What changes:**

The team card gains a **Members** row between the team name and the
objectives/strategy fields.

In edit mode (owners only):
- A multi-select dropdown that lists all current project members by name.
- Selected members show as avatar chips below the field.
- Saved with the existing `updateTeamAction` — add `member_user_ids` to the
  form data.

In read-only mode:
- A row of avatar chips (initials circles) with a tooltip showing the member
  name on hover.
- If the team has no members: subtle "No members assigned" label.

**Server action change (`apps/web/src/app/app/strategy/actions.ts`):**
- Parse `member_user_ids` as a comma-separated list of user IDs from the form
  (or a multi-select `<select multiple>`).
- Validate that all provided IDs are actual members of the project before saving.

---

### Feature 3 — Assign specs and discovery activities to a team member

**Where:**
- `/app/build/specs/new` — new spec form, add an "Assigned to" select.
- `/app/build/specs/[id]` — spec detail page, show and allow changing the
  assignee.
- Discovery activities (once the Discovery pages are built) — same pattern.

**UI:**
- A `<select>` populated with project members.
- Shows the assignee's avatar + name next to the spec title on the spec list
  cards.
- Unassigned specs show "Unassigned" in muted text.

---

### Feature 4 — "My Work" page

**Where:** New page at `/app/my-work`.

**Purpose:** A personal Trello-style board showing everything assigned to the
logged-in user, across Discovery and Build. Replaces the need to hunt through
the specs list or discovery activities list.

**Layout:**

Three columns (Kanban-style, horizontal scroll on mobile):

| Column | Contents |
|--------|----------|
| **Discovery** | Discovery activities assigned to me, grouped by linked insight. Status: Not started / In progress / Complete |
| **In Progress** | Specs assigned to me with status: In Progress or In Review |
| **Done** | Specs I've worked on recently (shipped in the last 30 days) + completed discovery activities |

Each card shows:
- Item title
- Mode badge (Discovery / Build label, different colour per mode)
- Status pill
- The insight or spec it's linked to (where applicable)
- "Open" link → goes straight to the spec or activity detail page

**Empty state:** If nothing is assigned, show a friendly prompt:
"Nothing assigned to you yet. Ask your project owner to assign you to some work,
or browse Insights to start a discovery."

**Sidebar link:** Add "My Work" as the first item in the sidebar, above the mode
sections, with a small user icon. Highlight it in ember orange when there are
items assigned.

---

## Implementation plan

### Phase 1 — Team member assignment in Strategy (~1.5 hours)

- [ ] Add `member_user_ids jsonb` column to `teams` (Drizzle migration + SQL file)
- [ ] Update `updateTeamAction` in `apps/web/src/app/app/strategy/actions.ts` to
      accept and validate `member_user_ids`
- [ ] Add a query helper `getProjectMembers(projectId)` in
      `packages/db/src/queries/` that returns all users in a project (join
      `project_users` → `users`)
- [ ] Update the Strategy page to:
  - Fetch project members alongside teams
  - Show a multi-select member picker in edit mode
  - Show avatar chips in read-only mode
- [ ] Add `assigned_user_id` column to `specs` (Drizzle migration)
- [ ] Add assignee picker to the new spec form and spec detail page
- [ ] Show assignee avatar on spec list cards

**Unlocks:** Owners can say "Sarah owns the Platform team" and "James is building
this spec." Members can see who is doing what.

---

### Phase 2 — Invite members (~2 hours)

- [ ] Create `project_invitations` table (Drizzle migration)
- [ ] Create `/app/settings/members` page with:
  - Current member list
  - Pending invitations list
  - "Invite by email" form
- [ ] Create `sendInviteAction` server action:
  - Generates a secure random token (`crypto.randomBytes`)
  - Inserts a `project_invitations` row
  - Sends an email via the existing mail infrastructure
- [ ] Create `/accept-invite` route handler that:
  - Validates token + expiry
  - Adds the user to `project_users`
  - Redirects to the app with a welcome notice
- [ ] Handle the "no account yet" case — redirect to sign-up with `?email=` and
      `?invite=` params, then auto-accept on registration
- [ ] Add a "Members" link to the Settings section of the sidebar

**Unlocks:** Real team members can be added without manual DB intervention.

---

### Phase 3 — My Work page (~2 hours)

- [ ] Add `assigned_user_id` column to `discovery_activities` (Drizzle migration)
- [ ] Add assignee picker to discovery activity forms
- [ ] Create `/app/my-work/page.tsx`:
  - Fetch all specs and discovery activities assigned to `session.user.id`
  - Group and sort by status
  - Render as three Kanban columns
- [ ] Add "My Work" link to the top of the sidebar nav (`SidebarNav.tsx`)
- [ ] Show an unread badge on the sidebar link if items exist

**Unlocks:** Every team member has a clear, personal view of what they are
supposed to be working on. No more hunting through lists.

---

## Design rules

**Owners invite, everyone else views.**
Only `is_owner = true` users can invite new members or remove existing ones.
All project members can view the member list and see who is assigned to what.

**Assignment is optional everywhere.**
Specs and activities can exist without an assignee. Never block creation.
Unassigned items simply don't appear on My Work — they are still visible in the
main lists.

**My Work is personal, not a team view.**
This is "my assignments", not a project-wide kanban. A shared project board
(where you see everyone's work) is a Phase 4+ feature if the team needs it.

**Team membership ≠ project access.**
Being added to a team in Strategy is for organisational clarity only. It does
not grant or remove project access. Project access is controlled by
`project_users` (set via invitations).

**Avatar initials fallback.**
When `avatar_url` is null, render a circle with the first letter of the user's
name in ember orange (matching the existing team-card avatar style that already
uses `var(--bs-primary)`).

**Don't send emails for internal assignments.**
For now, when a spec or activity is assigned to someone, there is no email
notification. The My Work page is the notification mechanism — keep it simple.
Notifications are a Phase 4 feature.

---

## Out of scope for v1

| Feature | Why deferred |
|---------|--------------|
| Per-member roles beyond owner/member | Adds complexity before we know if teams need it |
| Shared team kanban (everyone's work in one board) | Nice but My Work must exist first |
| Email/Slack notifications on assignment | Builds on top of the invite emails — do later |
| Activity feed / audit log | Useful but high effort; defer to Phase 5 |
| SSO / Google OAuth team sync | Separate integration work |
| Project-level permissions (view-only vs contributor) | Overkill for a small team tool in v1 |

---

## File checklist

Files that will need to be created or changed across all three phases:

| File | Change |
|------|--------|
| `packages/db/src/schema.ts` | Add `memberUserIds` to teams, `assignedUserId` to specs + activities |
| `packages/db/sql/` | New SQL files for each migration |
| `packages/db/src/queries/members.ts` | New — `getProjectMembers()` helper |
| `apps/web/src/app/app/strategy/actions.ts` | Handle `member_user_ids` in updateTeamAction |
| `apps/web/src/app/app/strategy/page.tsx` | Member picker UI in team cards |
| `apps/web/src/app/app/build/actions.ts` | Set `assigned_user_id` when creating/updating spec |
| `apps/web/src/app/app/build/specs/new/page.tsx` | Assignee select field |
| `apps/web/src/app/app/build/specs/[id]/page.tsx` | Show and edit assignee |
| `apps/web/src/app/app/settings/members/page.tsx` | New — member list + invite form |
| `apps/web/src/app/accept-invite/route.ts` | New — token validation + project_users insert |
| `apps/web/src/app/app/my-work/page.tsx` | New — personal kanban board |
| `apps/web/src/components/SidebarNav.tsx` | Add "My Work" link at top |

---

*Customer Pulse — Multi-User Plan generated Sat 25 Apr 2026*
