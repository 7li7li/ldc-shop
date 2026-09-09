#!/bin/sh
set -eu

echo "Starting LDC Shop (Docker)..."

# Auto-set AUTH_URL from APP_URL so NextAuth uses the correct external origin
# (Docker sets HOSTNAME=0.0.0.0 which would make NextAuth generate wrong callback URLs)
if [ -z "${AUTH_URL:-}" ] && [ -n "${APP_URL:-}" ]; then
    export AUTH_URL="$APP_URL"
    echo "AUTH_URL auto-set to $APP_URL"
fi

# Ensure data directory exists and is writable
mkdir -p /app/data 2>/dev/null || true
if [ ! -w /app/data ]; then
    echo "ERROR: /app/data is not writable; SQLite cannot start."
    echo "Fix: ensure the host volume directory is writable (chmod 777 ./data)"
    exit 1
fi

# Bring databases from the original Docker release forward before Drizzle
# compares schemas. This keeps existing SQLite data intact during upgrades.
echo "Running SQLite compatibility migrations..."
node migrate.mjs

# Apply the current Drizzle schema before serving requests. --force keeps
# first boot and additive upgrades non-interactive inside Docker.
echo "Running database migrations..."
npx drizzle-kit push --force

# Start the cron job in background
echo "Starting cron scheduler..."
node cron.mjs &

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
