# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

<!-- eslint-disable-next-line markdown/no-missing-label-refs -->

## [Unreleased]

## 2026-06-01

### Added

- Prisma client singleton utility (`src/lib/prisma.ts`)
- Modular Prisma schema split into `enums/` and `models/` directories
- Initial database migration (users, teams, secrets tables)
- Prisma CLI scripts to API package.json (generate, push, migrate, studio)
- Centralized `EnvUtils` class for typed, validated environment variable access
- Fastify app singleton instance with `@fastify/swagger` and `@fastify/swagger-ui` plugins
- Health route module in dedicated directory (`routes/health/health.route.ts`)
- `CHANGELOG.md` with project history

### Changed

- Migrated from `swagger-jsdoc` / `swagger-ui-express` to `@fastify/swagger` + `@fastify/swagger-ui`
- Replaced bare `process.env` access with typed `EnvUtils` class
- Restructured health route into `routes/health/` directory with route module pattern
- Updated root workspace `db:*` scripts to delegate to API package scripts
- Removed `PRISMA_ENGINES_CACHE_DIR` from `.env.example`

### Removed

- Old `config/env.ts` environment configuration
- Old flat `routes/health.ts` file
- Unused `swagger.js` configuration file
- `lib/` from `.gitignore` (restored to allow tracking `src/lib/`)

## 2026-05-31

### Added

- MIT License
- pnpm monorepo scaffold with API (Fastify + Prisma) and Web (React + Vite) applications
- Shared TypeScript config, ESLint, Prettier, Vitest, Husky, and Docker setup
- Database schema (Prisma) with initial models
- API entry point (`main.ts`) and flat app structure (`app.ts`)
- Swagger documentation configuration (`swagger.js`)
- Environment configuration utility (`config/env.ts`)
- Docker Compose setup for local development
- CI workflow (`.github/workflows/ci.yaml`)
- Docker image build workflow (`.github/workflows/docker-image.yml`)
- Winston logger utility replacing `console.log`
- `/health` health check endpoint

### Changed

- CI workflow migrated from npm to pnpm
- `.prettierignore` updated to include YAML files
- Replaced flat `app.ts` with modular `routes/` directory structure

### Removed

- e2e test step from CI workflow
- Old flat `app.ts` and its test file (replaced by modular route structure)
