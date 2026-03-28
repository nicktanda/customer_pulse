# Getting Customer Pulse Running Locally

This guide helps you run the app on your machine. Choose **one** of the two paths below.

---

## Option A: Docker (Recommended if you have Docker)

If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed:

```bash
# Build and start everything (PostgreSQL, Redis, Rails)
docker compose up --build

# On first run, you'll need to seed the database. In another terminal:
docker compose exec web bin/rails db:seed
```

Then open **http://localhost:3000** and log in with:
- **Email:** `admin@example.com`
- **Password:** `password123`

---

## Option B: Native Setup (Ruby, PostgreSQL, Redis on your Mac)

### 1. Install prerequisites

You need **Homebrew** first. If you don't have it, install from https://brew.sh

Then install everything:

```bash
# Ruby 3.3 via rbenv
brew install rbenv ruby-build
rbenv install 3.3.4
rbenv global 3.3.4  # or: cd customer_pulse && rbenv local 3.3.4

# Database and caching
brew install postgresql@16 redis

# Start services (run these in the background or as needed)
brew services start postgresql@16
brew services start redis

# Node.js and Yarn (for JS/CSS assets)
brew install node yarn
```

### 2. Install dependencies

```bash
cd customer_pulse
bundle install
yarn install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env if needed - most things work with defaults for local dev
```

### 4. Set up the database

```bash
bin/rails db:create db:migrate db:seed
```

### 5. Start the app

```bash
bin/dev
```

Then open **http://localhost:3000** and log in with:
- **Email:** `admin@example.com`
- **Password:** `password123`

---

## Troubleshooting

**"Could not find 'bundler'"** — You're using the wrong Ruby version. Run `ruby -v` (should show 3.3.x) and ensure rbenv is in your PATH.

**"Connection refused" for PostgreSQL** — Make sure PostgreSQL is running: `brew services start postgresql@16`

**"Connection refused" for Redis** — Make sure Redis is running: `brew services start redis`

**Port 3000 in use** — Stop any other app using that port, or set `PORT=3001 bin/dev` to use a different port.
