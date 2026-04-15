#!/usr/bin/env sh
# Reads an existing Rails .env (or the current .env) and generates
# the Next.js .env with the correct variable names.
#
# Usage:
#   ./scripts/migrate-env.sh                    # reads .env, writes .env.next
#   ./scripts/migrate-env.sh path/to/rails.env  # reads from a specific file
#   ./scripts/migrate-env.sh --in-place         # updates .env directly

set -e
cd "$(dirname "$0")/.."

SOURCE="${1:-.env}"
IN_PLACE=false
if [ "$1" = "--in-place" ]; then
  SOURCE=".env"
  IN_PLACE=true
fi

if [ ! -f "$SOURCE" ]; then
  echo "Error: $SOURCE not found"
  exit 1
fi

# Read a var from the source file
read_var() {
  grep -E "^$1=" "$SOURCE" 2>/dev/null | head -1 | cut -d'=' -f2- | sed "s/^['\"]//;s/['\"]$//"
}

# Carry over values that work in both stacks
DATABASE_URL=$(read_var DATABASE_URL)
REDIS_URL=$(read_var REDIS_URL)
LOCKBOX_MASTER_KEY=$(read_var LOCKBOX_MASTER_KEY)
ANTHROPIC_API_KEY=$(read_var ANTHROPIC_API_KEY)
RESEND_API_KEY=$(read_var RESEND_API_KEY)
GOOGLE_CLIENT_ID=$(read_var GOOGLE_CLIENT_ID)
GOOGLE_CLIENT_SECRET=$(read_var GOOGLE_CLIENT_SECRET)
SLACK_SIGNING_SECRET=$(read_var SLACK_SIGNING_SECRET)
LINEAR_WEBHOOK_SECRET=$(read_var LINEAR_WEBHOOK_SECRET)
SENTRY_DSN=$(read_var SENTRY_DSN)

# Rails SECRET_KEY_BASE can seed AUTH_SECRET if no AUTH_SECRET exists
AUTH_SECRET=$(read_var AUTH_SECRET)
if [ -z "$AUTH_SECRET" ]; then
  AUTH_SECRET=$(read_var SECRET_KEY_BASE)
fi
# If still empty, generate one
if [ -z "$AUTH_SECRET" ]; then
  AUTH_SECRET=$(openssl rand -hex 32)
  echo "Generated new AUTH_SECRET (no SECRET_KEY_BASE found)"
fi

NEXTAUTH_URL=$(read_var NEXTAUTH_URL)
if [ -z "$NEXTAUTH_URL" ]; then
  APP_HOST=$(read_var APP_HOST)
  if [ -n "$APP_HOST" ]; then
    NEXTAUTH_URL="https://$APP_HOST"
  else
    NEXTAUTH_URL="http://localhost:3001"
  fi
fi

# Email from address
EMAIL_FROM=$(read_var MAILER_FROM_ADDRESS)
if [ -z "$EMAIL_FROM" ]; then
  EMAIL_FROM=$(read_var EMAIL_FROM)
fi

# Bull Board (optional)
BULL_BOARD_PORT=$(read_var BULL_BOARD_PORT)
BULL_BOARD_USER=$(read_var BULL_BOARD_USER)
BULL_BOARD_PASS=$(read_var BULL_BOARD_PASS)

# Write output
if [ "$IN_PLACE" = true ]; then
  OUTPUT=".env"
  echo "Updating .env in place..."
else
  OUTPUT=".env.next"
  echo "Writing to $OUTPUT..."
fi

cat > "$OUTPUT" << ENVEOF
# === Core infrastructure ===
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL:-redis://127.0.0.1:6379/0}
LOCKBOX_MASTER_KEY=${LOCKBOX_MASTER_KEY}

# === Auth ===
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=${NEXTAUTH_URL}
${GOOGLE_CLIENT_ID:+GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}}
${GOOGLE_CLIENT_SECRET:+GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}}

# === AI ===
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
# ANTHROPIC_MODEL=claude-sonnet-4-20250514

# === Email ===
${RESEND_API_KEY:+RESEND_API_KEY=${RESEND_API_KEY}}
${EMAIL_FROM:+EMAIL_FROM=${EMAIL_FROM}}

# === Webhooks (optional) ===
${SLACK_SIGNING_SECRET:+SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}}
${LINEAR_WEBHOOK_SECRET:+LINEAR_WEBHOOK_SECRET=${LINEAR_WEBHOOK_SECRET}}

# === Monitoring (optional) ===
${SENTRY_DSN:+SENTRY_DSN=${SENTRY_DSN}}

# === Bull Board (optional) ===
${BULL_BOARD_PORT:+BULL_BOARD_PORT=${BULL_BOARD_PORT}}
${BULL_BOARD_USER:+BULL_BOARD_USER=${BULL_BOARD_USER}}
${BULL_BOARD_PASS:+BULL_BOARD_PASS=${BULL_BOARD_PASS}}
ENVEOF

# Clean up empty lines from unset optional vars
sed -i.bak '/^$/N;/^\n$/d' "$OUTPUT" 2>/dev/null && rm -f "$OUTPUT.bak" || true

echo ""
echo "Done! Key mappings:"
echo "  LOCKBOX_MASTER_KEY  -> same (decrypts existing DB credentials)"
echo "  SECRET_KEY_BASE     -> AUTH_SECRET"
echo "  APP_HOST            -> NEXTAUTH_URL"
echo "  MAILER_FROM_ADDRESS -> EMAIL_FROM"
echo ""
if [ "$IN_PLACE" = false ]; then
  echo "Review $OUTPUT, then: mv $OUTPUT .env"
fi
