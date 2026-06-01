# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

## [Unreleased]

## 2026-06-01

### Added

- Module-based architecture with route auto-loader (`utils/loader.ts`) using fast-glob to discover `.route.ts` files under `modules/`
- `AppRouteObject` type for type-safe route module exports (`types/route.ts`)
- Plugin registrations for `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, and `@fastify/jwt`
- `PrismaClient` singleton utility (`src/lib/prisma.ts`) with `@prisma/adapter-pg` connection
- Modular Prisma schema split into `enums/` (`UserRole`, `TeamMemberRole`, `TeamMemberPermission`) and `models/` (`User`, `Team`, `TeamMember`, `TeamInvite`, `Secret`, `UserBan`, `MFARecoveryCode`) directories
- Initial database migration creating all tables (users, teams, team_members, team_invites, team_member_permission_assignments, secrets, mfa_recovery_codes, user_bans)
- Prisma CLI scripts to API `package.json` (`prisma:generate`, `prisma:push`, `prisma:migrate`, `prisma:studio`)
- Updated root workspace `db:*` scripts to delegate to API package scripts
- `EnvUtils` class for typed, validated access to environment variables replacing bare `process.env`
- Centralized `Fastify` singleton instance (`lib/fastify.ts`) with Swagger OpenAPI 3.1.0 and Swagger UI (`/docs`) pre-configured
- `@fastify/cors`, `@fastify/helmet`, `@fastify/jwt`, `@fastify/rate-limit`, `fast-glob`, `winston`, and `winston-daily-rotate-file` dependencies
- `*todo.md` pattern to ESLint ignore list
- Inline JSDoc comments across `prisma.ts`, `logger.ts`, `main.ts`, and `env.ts` modules

### Changed

- Moved Swagger/OpenAPI and plugin registrations from `lib/fastify.ts` to `main.ts` (registered before route loading)
- Migrated from `swagger-jsdoc` / `swagger-ui-express` to `@fastify/swagger` + `@fastify/swagger-ui` with Fastify-native plugin registration
- Replaced flat `config/env.ts` with typed `utils/env.ts` using `EnvUtils` class
- Replaced bare `process.env` access with typed `EnvUtils` class
- Restructured core utilities: logger moved from `utils/` to `core/logger/`, Prisma client moved from `lib/` to `core/db/`, route modules moved from `modules/health/` to `routes/`
- Restructured health route from `routes/health.ts` into dedicated `routes/health/` directory, then to `modules/health/routes/`, and finally to `routes/`
- Enhanced health route documentation with OpenAPI schema annotations
- Simplified logger transports to a single rotating file for all levels instead of per-level files
- Updated `.prettierignore` to exclude `CHANGELOG.md` and `LICENSE` from formatting
- Moved test file from `src/__tests__/app.test.ts` to `src/routes/health/__tests__/health.test.ts`

### Removed

- Old `config/env.ts` environment configuration
- Old flat `routes/health.ts` route file
- Unused `swagger.js` configuration file
- `PRISMA_ENGINES_CACHE_DIR` from `.env.example`
- `lib/` from `.gitignore` to allow tracking `src/lib/`

### Fixed

- License type corrected from MIT to Apache 2.0 in CHANGELOG.md

## 2026-05-31

### Added

- Apache 2.0 License
- pnpm monorepo scaffold with `apps/api` (Fastify + Prisma + PostgreSQL) and `apps/web` (React + Vite + TypeScript) applications
- Shared TypeScript configuration (`tsconfig.base.json`), ESLint flat config (`eslint.config.mjs`), Prettier, Vitest, and Husky with pre-commit hook
- Docker setup with per-app Dockerfiles and `docker-compose.yml` (PostgreSQL service)
- Docker image build workflow (`.github/workflows/docker-image.yml`) triggered on push/PR to `main`
- Prisma schema with `User`, `Team`, and `Secret` models under `apps/api/prisma/`
- API entry point (`main.ts`), flat app structure (`app.ts`), and Swagger documentation (`swagger.js`)
- Environment configuration utility (`config/env.ts`)
- Winston logger utility replacing `console.log` with daily rotate file transports per log level
- `/health` endpoint returning `{ status: "ok" }`
- Test suite for `/health` endpoint using Vitest
- `.prettierignore` with YAML files exclusion

### Changed

- CI workflow migrated from npm to pnpm with `pnpm/action-setup` (version 11.5.0), `--frozen-lockfile` install, and updated cache configuration
- CI workflow steps updated from `npm run` to `pnpm` commands
- Updated `.prettierignore` to include YAML file patterns
- Docker build command in workflow uses `docker compose build`
- Restructured `app.ts` into `routes/health.ts`

### Removed

- E2e test step from CI workflow
