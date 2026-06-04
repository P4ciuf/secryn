FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --filter web...

WORKDIR /app/packages/shared
RUN npx tsc

WORKDIR /app/apps/web
RUN pnpm build

FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
