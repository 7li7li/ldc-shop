FROM node:20-alpine AS base
RUN npm install -g npm@11

# --- Dependencies ---
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Drizzle schema + config for migrations
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/schema.ts ./src/lib/db/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/schema.sqlite.ts ./src/lib/db/schema.sqlite.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/schema.mysql.ts ./src/lib/db/schema.mysql.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# node_modules needed for better-sqlite3 native addon + drizzle-kit
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Cron script
COPY --from=builder --chown=nextjs:nodejs /app/cron.mjs ./cron.mjs
COPY --from=builder --chown=nextjs:nodejs /app/migrate.mjs ./migrate.mjs

# Data directory for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data && chmod 777 /app/data

# Pre-create .next directory
RUN mkdir -p .next && chown nextjs:nodejs .next

# Entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN tr -d '\015' < ./entrypoint.sh > /tmp/entrypoint.sh \
  && mv /tmp/entrypoint.sh ./entrypoint.sh \
  && chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_PATH="/app/data/ldc-shop.sqlite"
ENV DB_TYPE="sqlite"

VOLUME ["/app/data"]

ENTRYPOINT ["./entrypoint.sh"]
