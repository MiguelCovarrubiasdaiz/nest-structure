# syntax=docker/dockerfile:1.7

# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    HUSKY=0
RUN corepack enable
WORKDIR /app

# ─── Deps (all, incl. dev) ────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc* ./
# `--ignore-scripts` skips husky's prepare hook (not needed inside Docker).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ─── Prod deps only ───────────────────────────────────────────────────────────
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Run as non-root user `node` (uid 1000) that ships with the node image
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build      /app/dist        ./dist
COPY --chown=node:node package.json ./

EXPOSE 3000

# Healthcheck hits the liveness endpoint over loopback. Falls back to wget
# (alpine ships with it) — no curl by default.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:${PORT}/api/health/live || exit 1

CMD ["node", "dist/main.js"]
