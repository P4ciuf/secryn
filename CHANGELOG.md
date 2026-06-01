# Changelog

## 2026-06-01

### Added

- Prisma client singleton utility in `src/lib/prisma.ts`
- Prisma CLI scripts (generate, push, migrate, studio) to API package.json
- Centralized `EnvUtils` class for typed, validated environment variable access
- Modular Prisma schema split into enums (`team.prisma`, `user.prisma`) and models (`secret.prisma`, `team.prisma`, `user.prisma`)

### Changed

- Restructured Prisma schema from monolithic `schema.prisma` into modular enums and models files
- Updated root workspace `db:*` scripts to delegate to API package scripts
- Migrated from `swagger-jsdoc` / `swagger-ui-express` to `@fastify/swagger` and `@fastify/swagger-ui` plugins
- Reorganized health route into a dedicated `routes/health/` directory
- Removed `lib/` from `.gitignore` to allow tracking `src/lib/`

### Removed

- Unused `swagger.js` configuration file
- Old `config/env.ts` and `routes/health.ts` files

## 2026-05-31

### Added

- MIT License
- pnpm monorepo scaffold with API (Fastify + Prisma) and Web (React + Vite) applications, including shared TypeScript config, ESLint, Prettier, Vitest, Husky, and Docker setup
- Docker image build workflow (`.github/workflows/docker-image.yml`)
- Winston logger utility replacing `console.log`
- `/health` health check endpoint
- CI workflow (`.github/workflows/ci.yaml`)

### Changed

- CI workflow migrated from npm to pnpm
- `.prettierignore` updated to include YAML files
- Replaced flat `app.ts` structure with modular routes and utilities

### Removed

- e2e test step from CI workflow
