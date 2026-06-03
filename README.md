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
- **Project Workspaces** — Organize secrets into projects with granular member permissions.
- **Authentication & Authorization** — Email/password registration with bcrypt hashing, JWT
  sessions, and fine-grained permission assignments (read, create, update, delete secrets,
  manage members, create invites, and more).
- **Team Invites** — Generate 7-day invitation links to add members to projects, with email
  notifications via Resend.
- **REST API** — Full OpenAPI 3.1.0 spec with Swagger UI at `/docs`. Route prefix `/api/v1`.
- **Web Dashboard** — Built with React 19, React Router 7, Tailwind CSS v4, shadcn/ui, and
  Radix UI primitives. Dark mode support via `next-themes`.
- **Security-first** — Helmet, CORS, rate limiting, bcrypt password hashing, JWT with cookies,
  AES-256 encryption key support, and Prisma with prepared statements via `@prisma/adapter-pg`.
- **Dockerized** — Production-ready multi-stage Dockerfiles for API and Web, plus a
  `docker-compose.yml` for local development with PostgreSQL 18.

## Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Language         | TypeScript 5+                       |
| Runtime          | Node.js 22+                         |
| Package Manager  | pnpm 11.5                           |
| API Framework    | Fastify 5                           |
| ORM              | Prisma 7 + PostgreSQL 18            |
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

# 4. Start PostgreSQL (via Docker)
docker compose up -d db

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

| Method   | Path                                            | Description                |
| -------- | ----------------------------------------------- | -------------------------- |
| `GET`    | `/api/v1/health`                                | Health check               |
| `POST`   | `/api/v1/auth/register`                         | Register a new user        |
| `POST`   | `/api/v1/auth/login`                            | Login                      |
| `POST`   | `/api/v1/auth/logout`                           | Logout (requires auth)     |
| `POST`   | `/api/v1/projects`                              | Create a project           |
| `GET`    | `/api/v1/projects/:id`                          | Get project details        |
| `PUT`    | `/api/v1/projects/:id`                          | Update project name        |
| `DELETE` | `/api/v1/projects/:id`                          | Delete a project           |
| `POST`   | `/api/v1/projects/:id/transfer`                 | Transfer project ownership |
| `POST`   | `/api/v1/projects/:id/invites`                  | Create project invite      |
| `GET`    | `/api/v1/projects/invites/:slug`                | Accept project invite      |
| `DELETE` | `/api/v1/projects/:projectId/members/:memberId` | Remove project member      |

## Configuration

All environment variables are defined in `.env.example`. Copy it to `.env` and fill in the values.

| Variable            | Required | Description                                                  |
| ------------------- | -------- | ------------------------------------------------------------ |
| `PORT`              | Yes      | API server port (default: `3000`)                            |
| `NODE_ENV`          | Yes      | Environment mode (`development`, `production`, `test`)       |
| `DATABASE_URL`      | Yes      | PostgreSQL connection string for Prisma                      |
| `POSTGRES_USER`     | Yes      | PostgreSQL superuser name                                    |
| `POSTGRES_PASSWORD` | Yes      | PostgreSQL superuser password                                |
| `POSTGRES_DB`       | Yes      | PostgreSQL database name                                     |
| `JWT_SECRET`        | Yes      | Secret key for signing JWT tokens (min 32 characters)        |
| `ENCRYPTION_KEY`    | Yes      | AES-256 key for secret encryption (min 32 characters)        |
| `EMAIL`             | Yes      | Sender email address for transactional emails (Resend)       |
| `RESEND_API_KEY`    | Yes      | API key for the Resend email delivery service                |
| `APP_URL`           | Yes      | Public URL of the application (e.g. `http://localhost:5173`) |

> **Note:** `APP_URL` is required by the API at startup but is currently missing from the
> shipped `.env.example` — add it manually.

## Project Structure

```text
securevault/
├── .github/
│   └── workflows/              # CI/CD pipelines (lint, test, Docker build)
├── apps/
│   ├── api/                    # Fastify REST API
│   │   ├── prisma/             # Database schema (models, enums, migrations)
│   │   └── src/
│   │       ├── core/           # Auth plugin, DB client, error handling, logger
│   │       ├── lib/            # Fastify app singleton
│   │       ├── modules/        # Business logic (project service, user repository)
│   │       ├── routes/         # HTTP route handlers with __tests__ co-location
│   │       ├── types/          # Fastify augmentation, route types
│   │       └── utils/          # Env access, email delivery, dynamic route loader
│   └── web/                    # React SPA frontend
│       └── src/
│           ├── components/     # common/ (EmptyState, Modal, PageHeader, SecretValue),
│           │                   # landing/ (Hero, Features, CTA, Navbar, Footer),
│           │                   # ui/ (48 shadcn/ui primitives)
│           ├── features/       # auth, api-docs, api-keys, dashboard, projects,
│           │                   # settings, webhooks (pages + components + tests)
│           ├── hooks/          # useClipboard, useMobile, useToggleVisibility
│           ├── layouts/        # DashboardLayout with sidebar navigation
│           ├── routes/         # React Router v7 configuration and path constants
│           ├── styles/         # Tailwind CSS v4 entry + design tokens
│           └── types/          # Shared TypeScript interfaces for all entities
├── docker-compose.yml          # Local dev stack: PostgreSQL + API + Web
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
