FROM node:24-slim AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable pnpm via Corepack so install and workspaces work inside Docker
RUN corepack enable && corepack prepare pnpm@latest --activate


FROM base AS builder

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api ./apps/api

# Install only the api workspace and its local dependencies (no dev scripts yet)
RUN pnpm install --filter api...

WORKDIR /app/apps/api

# Generate Prisma client from schema before building TypeScript
RUN pnpm prisma generate

RUN pnpm build


FROM node:24-alpine AS runtime

WORKDIR /app

# Suppress dev-only warnings and skip optional dev dependency installs
ENV NODE_ENV=production

# Copy compiled output, source config files, and hoisted node_modules
COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/node_modules /app/node_modules

WORKDIR /app/apps/api

# Run the compiled entry point directly via Node, no tsx or nodemon
CMD ["node", "dist/src/main.js"]
