---
name: test-and-ci-gate
description: >-
  Run RSpec, RuboCop, and Brakeman the same way CI does before push. Use when
  finishing a change, fixing CI failures, or onboarding to the project's quality gate.
---

# Test and CI gate

GitHub Actions ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)) runs **`bin/rubocop -f github`**, **`bin/brakeman --no-pager`**, **`bundle exec rspec`** (PostgreSQL + `yarn install`), and **`bin/document-skills-and-agents --check`** (job `docs_inventory`). Local testing uses **RSpec** under **`spec/`**. Overview of CI, Dependabot, and optional Sentry: **[`docs/agents.md`](../../../docs/agents.md)**. Generated skill index: **[`docs/skills-and-agents.md`](../../../docs/skills-and-agents.md)**.

## When to use

- Before opening or updating a PR.
- After refactors that touch many files.
- When CI fails on lint or security scan.

## Steps

1. Run **`bundle exec rspec`** (or narrow paths like **`spec/models/`**, **`spec/requests/`**).
2. Run **`bin/rubocop`** on changed Ruby files; fix or safely disable with team conventions.
3. Run **`bin/brakeman --no-pager`** for security warnings on Rails code.
4. If a Brakeman finding is a false positive, document why in the PR rather than silencing blindly.

## Notes

- Request specs exist for **webhooks** and **API** — keep them updated when contracts change.
- See **`CLAUDE.md`** for quick command reference.
