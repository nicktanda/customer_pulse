---
name: docker-and-local-dev
description: >-
  Run or debug the app with Docker Compose / Dockerfile.dev and compare with native
  setup. Use when editing docker-compose.yml, Dockerfile.dev, or helping someone
  whose bin/dev environment differs (ports, Redis, Postgres).
---

# Docker and local development

The repo may include **Docker**-based workflows alongside **native** setup documented in **`LOCAL_SETUP.md`** and **`README.md`**. **`bin/dev`** uses **Foreman** and **`Procfile.dev`** (web, JS/CSS watchers, Sidekiq) and loads **`.env`**.

## When to use

- Changing **`docker-compose.yml`**, **`Dockerfile.dev`**, or published ports.
- Debugging “works on my machine” issues with **Redis**, **Postgres**, or **binding hosts** (`0.0.0.0` vs `localhost`).

## Steps

1. Read **`LOCAL_SETUP.md`** for the intended Docker vs native path.
2. Ensure **Postgres** and **Redis** URLs match how containers resolve services (service hostnames in Compose).
3. Align **`Procfile.dev`** expectations: watchers and debugger flags as documented in comments there.
4. After changes, verify **`bin/dev`** (or the documented Docker command) starts all processes needed for feedback ingestion and jobs.

## Notes

- Do not commit **`.env`**; variable **names** belong in **`.env.example`** per project norms.
