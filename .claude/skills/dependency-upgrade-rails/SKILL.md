---
name: dependency-upgrade-rails
description: >-
  Plan and execute Ruby gem and Rails upgrades (patch/minor/major), including
  bundle update, deprecation fixes, and rails app:update cautions. Use when bumping
  rails in the Gemfile, large Dependabot PRs, or after security advisories.
---

# Dependency and Rails upgrades

Upgrades keep the app secure and maintainable; **major** Rails jumps need extra care.

## When to use

- Editing **`Gemfile`** / **`Gemfile.lock`**, especially **`rails`**.
- Reviewing **Dependabot** PRs (see **`docs/agents.md`**).
- Addressing **bundle audit** or security bulletins.

## Steps

1. Read the **Rails release notes** and **upgrade guide** for your target version.
2. On a **branch**, run **`bundle update`** (or targeted `bundle update rails`) and fix immediate boot errors.
3. Run **`bin/rails app:update`** only when ready — it may overwrite files; review diffs carefully (use git to revert unwanted generator churn).
4. Run **`bundle exec rspec`**, **`bin/rubocop`**, and **`bin/brakeman`** — same as CI (**`test-and-ci-gate`**).
5. For **yarn** / Node deps, run **`yarn install`** and smoke-test **`yarn build`** paths used in **`Procfile.dev`**.

## Notes

- Merge **one logical upgrade at a time** when possible (Rails vs unrelated gems).
- Keep **`CHANGELOG`** or PR description clear for the team.
