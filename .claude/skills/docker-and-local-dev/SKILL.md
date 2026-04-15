---
name: docker-and-local-dev
description: >-
  Run or debug the app with Docker Compose / Dockerfile.dev and compare with native
  setup. Use when editing docker-compose.yml, Dockerfile.dev, or helping someone
  whose yarn dev / bin/dev environment differs (ports, Redis, Postgres).
---

# Docker and local development

The repo includes **Docker Compose** alongside **native** setup in **`LOCAL_SETUP.md`** and **`README.md`**. **`bin/dev`** / **`yarn dev`** run **Next.js** and the **BullMQ worker** via **`concurrently`** (see root **`package.json`** and **`Procfile.dev`**).

## When to use

- Changing **`docker-compose.yml`**, **`Dockerfile.dev`**, or published ports.
- Debugging “works on my machine” issues with **Redis**, **Postgres**, or **binding hosts** (`0.0.0.0` vs `localhost`).

## Steps

1. Read **`LOCAL_SETUP.md`** for the intended Docker vs native path.
2. Ensure **Postgres** and **Redis** URLs match how containers resolve services (service hostnames in Compose).
3. Align with **`Procfile.dev`**: web on **3001**, worker + Bull Board on **3002** unless overridden.
4. After changes, verify **`docker compose up`** or **`yarn dev`** starts the processes needed for feedback ingestion and background jobs.

## Notes

- Do not commit **`.env`**; variable **names** belong in **`.env.example`** per project norms.
