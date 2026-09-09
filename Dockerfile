FROM node:20-alpine AS base
RUN npm install -g npm@11

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY _docker/package.json _docker/package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY _docker/src ./src
COPY _docker/public ./public
COPY _docker/next.config.ts ./next.config.ts
COPY _docker/postcss.config.mjs ./postcss.config.mjs
COPY _docker/tsconfig.json ./tsconfig.json
COPY _docker/drizzle.config.ts ./drizzle.config.ts
COPY _docker/cron.mjs ./cron.mjs
COPY _docker/migrate.mjs ./migrate.mjs
COPY _docker/package.json ./package.json

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_PATH="/app/data/ldc-shop.sqlite"

RUN addgroup --system --gid 1001 nodejs +  && adduser --system --uid 1001 nextjs +  && mkdir -p /app/data /app/.next +  && chown -R nextjs:nodejs /app/data /app/.next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db/schema.ts ./src/lib/db/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/cron.mjs ./cron.mjs
COPY --from=builder --chown=nextjs:nodejs /app/migrate.mjs ./migrate.mjs
COPY --chown=nextjs:nodejs _docker/entrypoint.sh ./entrypoint.sh

RUN tr -d '\015' < ./entrypoint.sh > /tmp/entrypoint.sh \
  && mv /tmp/entrypoint.sh ./entrypoint.sh \
  && chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
VOLUME ["/app/data"]
ENTRYPOINT ["./entrypoint.sh"]
