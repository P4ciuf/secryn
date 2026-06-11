# SecureVault

> A secure, developer-focused secrets management platform. Store, encrypt, and access API keys,
> tokens, and environment variables safely through a dashboard and API.

## Overview

SecureVault provides a self-hosted service for teams to manage application secrets — API keys,
database passwords, environment variables, and tokens — with encryption at rest, role-based
access control, and a modern React dashboard.

Built as a pnpm monorepo with a Fastify REST API and a React + Vite frontend. All data is
encrypted server-side before persistence. The API exposes programmatic access so you can
integrate secret retrieval into CI/CD pipelines and deployment workflows.

## Features

- **Secret Management** — Create, read, update, and delete encrypted secrets scoped by project.
  Export secrets as a downloadable `.env` file for local development and CI/CD pipelines.
- **Project Workspaces** — Organize secrets into projects with granular member permissions.
  Transfer ownership between team members.
- **Authentication & Authorization** — Email/password registration with bcrypt hashing, JWT
  sessions via httpOnly cookies, and fine-grained permission assignments (read, create, update,
  delete secrets, manage members, create invites, and more).
- **Multi-Factor Authentication** — TOTP-based MFA with QR code setup, one-time recovery codes,
  email backup code delivery, and brute-force rate limiting.
- **API Key Management** — Generate, edit, and revoke API keys with read/write permission
  scoping for programmatic access. Keys are encrypted at rest and prefixed with `sv_`.
- **Team Invites** — Generate 7-day invitation links to add members to projects, with email
  notifications via Resend.
- **Password Reset** — Self-service forgot-password flow with single-use email tokens and
  anti-enumeration protection (always returns success).
- **REST API** — Full OpenAPI 3.1.0 spec with Swagger UI at `/docs`. Route prefix `/api/v1`.
  Cookie-based auth for web sessions and API key header auth for programmatic access.
- **Web Dashboard** — Built with React 19, React Router 7, Tailwind CSS v4, shadcn/ui, and
  Radix UI primitives. Dark mode support via `next-themes`.
- **Security-first** — Helmet, CORS with explicit allowlist, rate limiting, bcrypt password
  hashing, JWT with httpOnly cookies, AES-256-GCM secret encryption, brute-force login
  protection via Redis, and Prisma with prepared statements via `@prisma/adapter-pg`.
- **Audit Logging** — Security-relevant events (login success/failure, MFA changes, secret
  CRUD, password changes) logged at info level for SIEM/log aggregation.
- **Dockerized** — Production-ready multi-stage Dockerfiles for API (Node.js) and Web (Nginx),
  plus a `docker-compose.yml` for local development with PostgreSQL 18 and Redis 7.

## Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Language         | TypeScript 5+                       |
| Runtime          | Node.js 22+                         |
| Package Manager  | pnpm 11.5                           |
| API Framework    | Fastify 5                           |
| ORM              | Prisma 7 + PostgreSQL 18            |
| Cache / Session  | Redis 7 (ioredis)                   |
| Email            | Resend                              |
| Frontend         | React 19 + Vite 8 + Tailwind CSS v4 |
| UI Components    | shadcn/ui + Radix UI primitives     |
| Testing          | Vitest 4 + Testing Library          |
| Linting          | ESLint 10 + Prettier 3              |
| CI/CD            | GitHub Actions                      |
| Containerization | Docker + Docker Compose             |

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 11.5 (enforced via `packageManager` field and Corepack)
- **PostgreSQL** >= 16 (or use the `docker-compose.yml` db service)
- **Redis** >= 7 (or use the `docker-compose.yml` redis service)
- **Docker** (optional, for containerized development)

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/P4ciuf/securevault.git
cd securevault

# 2. Enable Corepack (bundled with Node.js 22+) and install dependencies
corepack enable
pnpm install

# 3. Create environment file from the example
cp .env.example .env
# Edit .env with your own secrets before starting the server

# 4. Start PostgreSQL and Redis (via Docker)
docker compose up -d db redis

# 5. Generate the Prisma client and push the database schema
pnpm db:generate
pnpm db:push

# 6. Start both API and Web in development mode
pnpm dev:api   # http://localhost:3000
pnpm dev:web   # http://localhost:5173
```

To run the full stack with Docker:

```bash
cp .env.example .env   # fill in required values
docker compose up --build
```

## Usage

After starting the services, access:

- **Web Dashboard** at [http://localhost:5173](http://localhost:5173)
- **API** at [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- **Swagger UI** at [http://localhost:3000/docs](http://localhost:3000/docs)

### API Endpoints

#### Auth

| Method | Path                           | Description                                   |
| ------ | ------------------------------ | --------------------------------------------- |
| `POST` | `/api/v1/auth/register`        | Register a new user                           |
| `POST` | `/api/v1/auth/login`           | Login (returns MFA challenge when enabled)    |
| `POST` | `/api/v1/auth/logout`          | Logout (requires auth)                        |
| `POST` | `/api/v1/auth/refresh`         | Refresh JWT session without re-authentication |
| `POST` | `/api/v1/auth/forgot-password` | Request a password reset email                |
| `POST` | `/api/v1/auth/reset-password`  | Reset password with a single-use token        |

#### MFA

| Method | Path                                         | Description                              |
| ------ | -------------------------------------------- | ---------------------------------------- |
| `GET`  | `/api/v1/auth/mfa/setup`                     | Generate TOTP secret and QR code         |
| `POST` | `/api/v1/auth/mfa/enable`                    | Verify TOTP code and activate MFA        |
| `POST` | `/api/v1/auth/mfa/disable`                   | Disable MFA and clear recovery codes     |
| `POST` | `/api/v1/auth/mfa/confirm`                   | Verify TOTP code during MFA-gated login  |
| `POST` | `/api/v1/auth/mfa/recovery`                  | Authenticate with a backup recovery code |
| `GET`  | `/api/v1/auth/mfa/status`                    | Check whether MFA is enabled             |
| `GET`  | `/api/v1/auth/mfa/recovery-codes`            | List valid recovery codes                |
| `POST` | `/api/v1/auth/mfa/recovery-codes/regenerate` | Invalidate and regenerate recovery codes |
| `POST` | `/api/v1/auth/mfa/send-backup-code`          | Send a backup code via email             |

#### Users

| Method   | Path                    | Description                                     |
| -------- | ----------------------- | ----------------------------------------------- |
| `GET`    | `/api/v1/users/:userId` | Retrieve a user (use `@me` for current user)    |
| `PUT`    | `/api/v1/users`         | Update authenticated user's profile or password |
| `DELETE` | `/api/v1/users`         | Permanently delete the authenticated account    |

#### Projects

| Method   | Path                            | Description                     |
| -------- | ------------------------------- | ------------------------------- |
| `POST`   | `/api/v1/projects`              | Create a project                |
| `GET`    | `/api/v1/projects/:id`          | Get project details             |
| `PUT`    | `/api/v1/projects/:id`          | Update project name/description |
| `DELETE` | `/api/v1/projects/:id`          | Delete a project                |
| `POST`   | `/api/v1/projects/:id/transfer` | Transfer project ownership      |

#### Project Members

| Method   | Path                                                        | Description                      |
| -------- | ----------------------------------------------------------- | -------------------------------- |
| `DELETE` | `/api/v1/projects/:projectId/members/:memberId`             | Remove a member from a project   |
| `POST`   | `/api/v1/projects/:projectId/members/:memberId/permissions` | Add permissions to a member      |
| `DELETE` | `/api/v1/projects/:projectId/members/:memberId/permissions` | Remove permissions from a member |

#### Project Invites

| Method | Path                             | Description             |
| ------ | -------------------------------- | ----------------------- |
| `POST` | `/api/v1/projects/:id/invites`   | Create a project invite |
| `GET`  | `/api/v1/projects/invites/:slug` | Accept a project invite |

#### Secrets

| Method   | Path                                         | Description                                  |
| -------- | -------------------------------------------- | -------------------------------------------- |
| `POST`   | `/api/v1/projects/:projectId/secrets`        | Create an encrypted secret in a project      |
| `GET`    | `/api/v1/projects/:projectId/secrets`        | List all secrets in a project (decrypted)    |
| `GET`    | `/api/v1/projects/secrets/:id`               | Get a single secret by ID (decrypted)        |
| `PUT`    | `/api/v1/projects/secrets/:id`               | Update a secret's name, value, or notes      |
| `DELETE` | `/api/v1/projects/secrets/:id`               | Permanently delete a secret                  |
| `GET`    | `/api/v1/projects/:projectId/secrets/export` | Export secrets as a downloadable `.env` file |

#### API Keys

| Method   | Path                         | Description                                  |
| -------- | ---------------------------- | -------------------------------------------- |
| `POST`   | `/api/v1/api-keys`           | Generate a new API key                       |
| `GET`    | `/api/v1/api-keys/@all-user` | List all API keys for the authenticated user |
| `GET`    | `/api/v1/api-keys/:id`       | Get a single API key by ID                   |
| `PUT`    | `/api/v1/api-keys/:id`       | Update API key name, status, or permissions  |
| `DELETE` | `/api/v1/api-keys/:id`       | Permanently delete an API key                |

#### Health

| Method | Path             | Description  |
| ------ | ---------------- | ------------ |
| `GET`  | `/api/v1/health` | Health check |

## Configuration

All environment variables are defined in `.env.example`. Copy it to `.env` and fill in the values.

| Variable            | Required | Description                                                       |
| ------------------- | -------- | ----------------------------------------------------------------- |
| `PORT`              | Yes      | API server port (default: `3000`)                                 |
| `NODE_ENV`          | Yes      | Environment mode (`development`, `production`, `test`)            |
| `DATABASE_URL`      | Yes      | PostgreSQL connection string for Prisma                           |
| `POSTGRES_USER`     | Yes      | PostgreSQL superuser name                                         |
| `POSTGRES_PASSWORD` | Yes      | PostgreSQL superuser password                                     |
| `POSTGRES_DB`       | Yes      | PostgreSQL database name                                          |
| `REDIS_URL`         | Yes      | Redis connection string (e.g. `redis://localhost:6379`)           |
| `JWT_SECRET`        | Yes      | Secret key for signing JWT tokens (min 32 characters)             |
| `ENCRYPTION_KEY`    | Yes      | AES-256 key for secret encryption (min 32 characters)             |
| `EMAIL`             | Yes      | Sender email address for transactional emails (Resend)            |
| `RESEND_API_KEY`    | Yes      | API key for the Resend email delivery service                     |
| `APP_URL`           | Yes      | Public URL of the application (e.g. `http://localhost:5173`)      |
| `CORS_ORIGINS`      | No       | Comma-separated additional CORS origins (falls back to `APP_URL`) |

## Project Structure

```text
securevault/
├── .github/
│   └── workflows/              # CI/CD pipelines (lint, test, Docker build)
├── apps/
│   ├── api/                    # Fastify REST API
│   │   ├── prisma/             # Database schema (models, enums, migrations)
│   │   └── src/
│   │       ├── core/           # Auth plugin, DB client, API keys, error handling, logger
│   │       ├── lib/            # Fastify app singleton
│   │       ├── modules/        # Business logic (project, user services and repositories)
│   │       ├── routes/         # HTTP route handlers with __tests__ co-location
│   │       ├── types/          # Fastify augmentation, route types
│   │       └── utils/          # Env access, crypto, email, Redis, dynamic route loader
│   └── web/                    # React SPA frontend
│       └── src/
│           ├── components/     # common/ (EmptyState, Modal, PageHeader, SecretValue),
│           │                   # landing/ (Hero, Features, CTA, Navbar, Footer),
│           │                   # ui/ (48 shadcn/ui primitives)
│           ├── data/           # Mock data for development and tests
│           ├── features/       # api-docs, api-keys, auth, dashboard, projects,
│           │                   # settings, webhooks (pages + components + tests)
│           ├── hooks/          # useClipboard, useMobile, useToggleVisibility
│           ├── layouts/        # DashboardLayout with sidebar navigation
│           ├── lib/            # Typed API client with auto-refresh and error handling
│           ├── pages/          # Landing and NotFound page components
│           ├── routes/         # React Router v7 configuration and path constants
│           ├── styles/         # Tailwind CSS v4 entry + design tokens
│           └── types/          # Shared TypeScript interfaces for all entities
├── packages/
│   └── shared/                 # @repo/shared — types, DTOs, and enums for API and web
├── docker-compose.yml          # Local dev stack: PostgreSQL, Redis, API, Web
├── eslint.config.mjs           # ESLint flat config (TS, JSON, Markdown, CSS)
├── pnpm-workspace.yaml         # pnpm monorepo workspace definition
├── tsconfig.base.json          # Shared TypeScript compiler options
├── package.json                # Root workspace scripts and shared devDependencies
└── vitest.config.js            # Root Vitest configuration
```

## Scripts

All scripts run from the repository root via pnpm.

| Script               | Description                                        |
| -------------------- | -------------------------------------------------- |
| `pnpm build`         | Build all workspace packages                       |
| `pnpm lint`          | Run ESLint across the entire monorepo              |
| `pnpm format`        | Format all files with Prettier                     |
| `pnpm format:check`  | Check formatting without writing changes           |
| `pnpm typecheck`     | Run `tsc --noEmit` on all packages                 |
| `pnpm test`          | Run all Vitest test suites                         |
| `pnpm test:coverage` | Run tests with coverage report                     |
| `pnpm dev:api`       | Start API in watch mode (port 3000)                |
| `pnpm dev:web`       | Start Vite dev server for the frontend (port 5173) |
| `pnpm db:generate`   | Generate Prisma client from schema                 |
| `pnpm db:push`       | Push Prisma schema to the database                 |
| `pnpm db:migrate`    | Create and apply a new database migration          |
| `pnpm db:studio`     | Launch Prisma Studio GUI                           |
| `pnpm docker:up`     | Build and start all Docker Compose services        |
| `pnpm docker:down`   | Stop and remove Docker Compose services            |
| `pnpm docker:reset`  | Stop services and remove volumes (resets DB)       |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
