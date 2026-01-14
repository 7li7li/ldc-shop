#!/bin/sh

# Wait for DB to be ready (simplistic approach, or just let drizzle retry)
echo "Starting LDC Shop..."

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit push

# Start the application
echo "Starting Next.js server..."
node server.js
