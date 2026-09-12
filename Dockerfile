FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV STANDALONE=true

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at runtime — .env is deliberately excluded from the build context
# (see .dockerignore, so secrets never end up baked into an image layer),
# so these must come in as build args instead. Passed from
# docker-compose.yml's `build.args`, which Compose fills from .env the same
# way it fills `environment:` — without this, every NEXT_PUBLIC_FIREBASE_*
# value silently compiles to `undefined` in the browser and push
# notifications never even attempt to initialize.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy prisma + migrations + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

# Copy full node_modules for prisma CLI + bcryptjs
COPY --from=deps /app/node_modules ./node_modules

# Copy scripts + entrypoint
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh && \
    sed -i 's/\r$//' ./scripts/seed-prod.sh && chmod +x ./scripts/seed-prod.sh

EXPOSE 3030
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
