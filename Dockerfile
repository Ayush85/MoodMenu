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
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client && \
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

USER nextjs

EXPOSE 3030
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
