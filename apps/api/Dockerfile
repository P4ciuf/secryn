FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --filter api...

WORKDIR /app/packages/shared
RUN npx tsc

WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY --from=builder /app/apps/api /app/apps/api
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/node_modules /app/node_modules

WORKDIR /app/apps/api

ENV PORT=3000

EXPOSE 3000

CMD npx prisma db push --accept-data-loss && node dist/src/main.js
