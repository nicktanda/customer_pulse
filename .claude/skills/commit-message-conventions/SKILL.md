---
name: commit-message-conventions
description: >-
  Writes clear commit messages and optional Conventional-style prefixes for this
  repo. Use when the user asks for commit text, squash messages, or PR titles
  aligned with team history.
---

# Commit message conventions

Good messages make **`git blame`** and release archaeology useful for the whole team.

## When to use

- Drafting a **commit message** before `git commit`.
- Choosing a **PR title** or **squash merge** summary.
- Aligning with **changelog** or release notes (**`customer-documentation`**).

## Steps

1. **Subject line** — ~50 chars; imperative mood (“Add webhook idempotency”), not past tense.
2. **Optional body** — Why the change, tradeoffs, or links to tickets — wrap at ~72 chars.
3. **Optional prefix** — If the team uses Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` — match what `git log` already shows in this repo.
4. **Scope** — Mention area when helpful: `webhooks:`, `integrations:`, `pulse:`.

## Notes

- One logical change per commit when possible; easier to revert.
- **Do not** put secrets or tokens in commit messages.
