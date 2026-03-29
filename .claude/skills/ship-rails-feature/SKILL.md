---
name: ship-rails-feature
description: >-
  Guides feature work in this Rails 8 + Hotwire + Tailwind codebase: controllers,
  Stimulus/Turbo, Propshaft assets (yarn build), and Devise-authenticated routes.
  Use when adding or changing user-facing pages, dashboard, feedback, integrations,
  settings, or onboarding flows under app/controllers and app/views.
---

# Ship a Rails feature (Customer Pulse)

Customer Pulse uses **Rails 8**, **Devise** for auth, **Turbo + Stimulus**, **Tailwind** (via `yarn build:css`), and **esbuild** for JS (`yarn build`). Most UX lives behind `authenticate :user` in `config/routes.rb`.

## When to use

- Adding or changing a screen under authenticated routes (dashboard, feedback, integrations, onboarding, settings, pulse reports).
- Wiring new member/collection actions on existing resources.

## Steps

1. Read **`config/routes.rb`** to find the right resource and whether the route is inside `authenticate :user`.
2. Put controller logic in the matching controller under **`app/controllers/`**; keep fat domain logic in **`app/models/`** or **`app/services/`** (see other skills for AI, integrations, jobs).
3. For HTML responses, add/update views under **`app/views/`**; match existing Tailwind patterns and partials.
4. If you add Stimulus controllers, place them under **`app/javascript/controllers/`** and ensure **`yarn build`** (or `bin/dev`) picks them up.
5. After UI or behavior changes, run **`bundle exec rspec`** for affected areas; use **`bin/rubocop`** on touched Ruby files.

## Notes

- Unauthenticated root vs authenticated root is defined in `config/routes.rb`; do not break Devise flows.
- Asset pipeline: **`package.json`** scripts — after CSS/JS changes, dev uses watchers via **`Procfile.dev`**.
