# -----------------------------------------------------------------------------
# secryn - Next.js App Router Dockerfile
# -----------------------------------------------------------------------------
# Multi-stage build:
#   1. builder  - Compiles the shared package, generates Prisma client, builds Next.js.
#   2. runtime  - Production image with only the built artifacts and wget for
#                 Docker health checks.
# -----------------------------------------------------------------------------

FROM node:22-alpine AS builder

WORKDIR /secryn

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared ./packages/shared
COPY app/package.json app/package.json
COPY app/tsconfig.json app/tsconfig.json
COPY app/next.config.ts ./app/next.config.ts
COPY app/postcss.config.mjs ./app/postcss.config.mjs
COPY app/prisma.config.ts ./app/prisma.config.ts
COPY app/prisma ./app/prisma
COPY app/src ./app/src

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install

WORKDIR /secryn/packages/shared
RUN npx tsc

WORKDIR /secryn/app
RUN pnpm prisma:generate
RUN pnpm build

FROM node:22-alpine

WORKDIR /secryn

ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY --from=builder /secryn/app /secryn/app
COPY --from=builder /secryn/packages/shared /secryn/packages/shared
COPY --from=builder /secryn/node_modules /secryn/node_modules

WORKDIR /secryn/app

ENV PORT=3000

EXPOSE 3000

CMD npx prisma db push --accept-data-loss && npx next start