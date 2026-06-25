# Secryn

> A secure, developer-focused secrets management platform. Store, encrypt, and access API keys,
> tokens, and environment variables safely through a dashboard, CLI, and API.
>
> **Production**: [secryn.xyz](https://secryn.xyz) — **API**: [secryn.xyz/api](https://secryn.xyz/api/v1/health)

## Overview

Secryn provides a self-hosted service for teams to manage application secrets — API keys,
database passwords, environment variables, and tokens — with encryption at rest, role-based
access control, and a modern React dashboard.

Built as a pnpm monorepo with a Next.js App Router application. All data is encrypted
server-side before persistence. The API exposes programmatic access so you can integrate
secret retrieval into CI/CD pipelines and deployment workflows.

## Features

- **Secret Management** — Create, read, update, and delete encrypted secrets scoped by project.
  Export secrets as a downloadable `.env` file for local development and CI/CD pipelines.
- **Project Workspaces** — Organize secrets into projects with granular member permissions.
  Transfer ownership between team members.
- **Authentication & Authorization** — Email/password registration with bcrypt hashing, NextAuth.js v5
  JWT sessions via httpOnly cookies, and fine-grained permission assignments (read, create, update,
  delete secrets, manage members, create invites, and more).
- **API Key Management** — Generate, edit, and revoke API keys with read/write permission
  scoping for programmatic access. Keys are encrypted at rest and prefixed with `sc_`.
- **Team Invites** — Generate 7-day invitation links to add members to projects, with email
  notifications via Resend.
- **Password Reset** — Self-service forgot-password flow with single-use email tokens and
  anti-enumeration protection (always returns success).
- **REST API** — Full API with cookie-based auth for web sessions and API key header auth
  for programmatic access.
- **Web Dashboard** — Built with Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, and
  Radix UI primitives. Dark mode support via `class` strategy.
- **Security-first** — Security response headers (X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy), CORS with explicit allowlist, rate limiting, bcrypt password hashing,
  JWT with httpOnly cookies, AES-256-GCM secret encryption, brute-force login protection
  via Redis, and Prisma with prepared statements via `@prisma/adapter-pg`.
- **Audit Logging** — Security-relevant events (login success/failure, secret CRUD,
  password changes) logged at info level for SIEM/log aggregation.
- **Dockerized** — Production-ready multi-stage Dockerfile for the Next.js app, plus nginx
  reverse proxy with SSL termination and a `docker-compose.yml` for local development with
  PostgreSQL 18 and Redis 7.
- **CLI Tool** — Command-line interface for managing secrets, projects, and API keys directly
  from the terminal. Supports login, CRUD operations, `.env` export, and JSON output.
- **SDKs** — Python (`secryn`) and TypeScript (`secryn`) client libraries with
  namespaced proxy objects for all API resources and built-in cookie persistence.

## Tech Stack

| Layer            | Technology                      |
| ---------------- | ------------------------------- |
| Language         | TypeScript 5+                   |
| Runtime          | Node.js 22+                     |
| Package Manager  | pnpm 11.5                       |
| Framework        | Next.js 16 (App Router)         |
| ORM              | Prisma 7 + PostgreSQL 18        |
| Cache / Session  | Redis 7 (ioredis)               |
| Auth             | NextAuth.js v5 (credentials)    |
| Email            | Resend                          |
| Frontend         | React 19 + Tailwind CSS v4      |
| UI Components    | shadcn/ui + Radix UI primitives |
| Testing          | Vitest 4 + Testing Library      |
| Linting          | ESLint 10 + Prettier 3          |
| CLI              | Python 3.10+ + Click + Requests |
| CI/CD            | GitHub Actions                  |
| Containerization | Docker + Docker Compose         |

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 11.5 (enforced via `packageManager` field and Corepack)
- **PostgreSQL** >= 16 (or use the `docker-compose.yml` db service)
- **Redis** >= 7 (or use the `docker-compose.yml` redis service)
- **Docker** (optional, for containerized development)

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/P4ciuf/secryn.git
cd secryn

# 2. Enable Corepack (bundled with Node.js 22+) and install dependencies
corepack enable
pnpm install

# 3. Create environment file from the example
cp app/.env.example app/.env
# Edit app/.env with your own secrets before starting the server

# 4. Start PostgreSQL and Redis (via Docker)
docker compose up -d db redis

# 5. Generate the Prisma client and push the database schema
pnpm db:generate
pnpm db:push

# 6. Start the Next.js development server
pnpm dev       # http://localhost:3000
```

To run the full stack with Docker:

```bash
cp app/.env.example app/.env   # fill in required values
docker compose up --build
```

## CLI

Secryn ships with a command-line tool (`sc`) for managing secrets without leaving
the terminal. It supports cookie-based authentication, project and secret CRUD, API key
management, and `.env` export. Requires Python 3.10+.

### Installing the CLI

**Via pipx (recommended)**

```bash
pipx install secryn-cli
```

**From source with pipx**

```bash
cd packages/cli
pipx install -e .
```

**Manual install with venv** (when pipx is not available)

```bash
cd packages/cli
python3 -m venv .venv
.venv/bin/pip install -e .
ln -sf $(pwd)/.venv/bin/sc ~/.local/bin/sc
```

**One-liner install script**

```bash
curl -fsSL https://raw.githubusercontent.com/P4ciuf/secryn/main/packages/cli/install.sh | bash
```

### CLI Commands

```bash
sc --help                    # Show general help
sc --api-url <url>           # Override the API URL for each command
```

**Authentication**

```bash
sc auth login                                   # Interactive login (email + password)
sc auth login --email <email> --password <pw>   # Non-interactive login
sc auth logout                                  # Logout and clear cookies
sc auth whoami                                  # Show the logged-in user
sc auth whoami --json                           # Output in JSON format
```

**Projects**

```bash
sc projects list                        # List all projects
sc projects list --json                 # List projects in JSON format
sc projects create --name <name>        # Create a new project
sc projects create --name <name>        # Create a project with a description
  --description <desc>
sc projects delete --id <id>            # Delete a project (with confirmation)
sc projects delete --id <id> -f         # Delete without asking for confirmation
```

**Secrets**

```bash
sc secrets list --project-id <id>             # List secrets for a project
sc secrets list --project-id <id> --json      # List secrets in JSON format
sc secrets get --id <id>                      # Show a secret (value masked)
sc secrets get --id <id> --show-value         # Show the plaintext value
sc secrets get --id <id> --json               # Output in JSON format
sc secrets create --project-id <id>           # Create a new secret
  --name <name> --value <value>
sc secrets create --project-id <id>           # Create a secret with notes
  --name <name> --value <value>
  --notes <notes>
sc secrets update --id <id>                   # Update name, value, and/or notes
  --name <new> --value <new>
  --notes <new>
sc secrets delete --id <id>                   # Delete a secret
sc secrets delete --id <id> -f                # Delete without confirmation
sc secrets export --project-id <id>           # Export to .env format (stdout)
sc secrets export --project-id <id>           # Export to a file
  -o .env
```

**API Keys**

```bash
sc api-keys list                        # List all API keys
sc api-keys list --json                 # List in JSON format
sc api-keys create --name <name>        # Create an API key (read+write)
sc api-keys create --name <name>        # Create an API key with specific permissions
  --permissions read
sc api-keys delete --id <id>            # Delete an API key
sc api-keys delete --id <id> -f         # Delete without confirmation
```

**User and Configuration**

```bash
sc user info                # Show user profile
sc config                   # Show configuration paths and values
sc version                  # CLI version
```

**Global Options**

| Option                 | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `--api-url <url>`      | Override API base URL (default: `http://localhost:3000` in dev, `https://secryn.xyz` in prod) |
| `SECRYN_API_URL` (env) | Alternative to `--api-url` via environment variable                                           |
| `SECRYN_HOME` (env)    | Alternative configuration directory                                                           |
| `--json`               | Output in JSON format (where supported)                                                       |
| `--force`, `-f`        | Skip confirmations for destructive commands                                                   |

### Configuration

The CLI stores configuration and cookies in `~/.config/secryn/`:

| File           | Content                       |
| -------------- | ----------------------------- |
| `config.json`  | API URL, user ID, email       |
| `cookies.json` | JWT session cookie (httpOnly) |

## Usage

After starting the services, access:

- **Web Dashboard** at [http://localhost:3000](http://localhost:3000) (dev) or [https://secryn.xyz](https://secryn.xyz) (prod)
- **API** at [http://localhost:3000/api/v1](http://localhost:3000/api/v1) (dev) or [https://secryn.xyz/api/v1](https://secryn.xyz/api/v1) (prod)

### API Endpoints

#### Auth

| Method | Path                           | Description                                     |
| ------ | ------------------------------ | ----------------------------------------------- |
| `GET`  | `/api/v1/auth/[...nextauth]`   | NextAuth catch-all (sign-in/out, session, csrf) |
| `POST` | `/api/v1/auth/[...nextauth]`   | NextAuth catch-all (credentials callback)       |
| `POST` | `/api/v1/auth/forgot-password` | Request a password reset email                  |
| `POST` | `/api/v1/auth/reset-password`  | Reset password with a single-use token          |

#### Users

| Method   | Path               | Description                                     |
| -------- | ------------------ | ----------------------------------------------- |
| `GET`    | `/api/v1/users/me` | Retrieve authenticated user profile             |
| `PUT`    | `/api/v1/users/me` | Update authenticated user's profile or password |
| `DELETE` | `/api/v1/users/me` | Permanently delete the authenticated account    |

#### Projects

| Method   | Path                            | Description                     |
| -------- | ------------------------------- | ------------------------------- |
| `POST`   | `/api/v1/projects`              | Create a project                |
| `GET`    | `/api/v1/projects/:id`          | Get project details             |
| `PUT`    | `/api/v1/projects/:id`          | Update project name/description |
| `DELETE` | `/api/v1/projects/:id`          | Delete a project                |
| `POST`   | `/api/v1/projects/:id/transfer` | Transfer project ownership      |

#### Project Members

| Method   | Path                                                 | Description                      |
| -------- | ---------------------------------------------------- | -------------------------------- |
| `DELETE` | `/api/v1/projects/:id/members/:memberId`             | Remove a member from a project   |
| `POST`   | `/api/v1/projects/:id/members/:memberId/permissions` | Add permissions to a member      |
| `DELETE` | `/api/v1/projects/:id/members/:memberId/permissions` | Remove permissions from a member |

#### Project Invites

| Method | Path                             | Description             |
| ------ | -------------------------------- | ----------------------- |
| `POST` | `/api/v1/projects/:id/invites`   | Create a project invite |
| `GET`  | `/api/v1/projects/invites/:slug` | Accept a project invite |

#### Secrets

| Method   | Path                                     | Description                                  |
| -------- | ---------------------------------------- | -------------------------------------------- |
| `POST`   | `/api/v1/projects/:id/secrets`           | Create an encrypted secret in a project      |
| `GET`    | `/api/v1/projects/:id/secrets`           | List all secrets in a project (decrypted)    |
| `GET`    | `/api/v1/projects/:id/secrets/:secretId` | Get a single secret by ID (decrypted)        |
| `PUT`    | `/api/v1/projects/:id/secrets/:secretId` | Update a secret's name, value, or notes      |
| `DELETE` | `/api/v1/projects/:id/secrets/:secretId` | Permanently delete a secret                  |
| `GET`    | `/api/v1/projects/:id/secrets/export`    | Export secrets as a downloadable `.env` file |

#### API Keys

| Method   | Path                   | Description                                  |
| -------- | ---------------------- | -------------------------------------------- |
| `POST`   | `/api/v1/api-keys`     | Generate a new API key                       |
| `GET`    | `/api/v1/api-keys`     | List all API keys for the authenticated user |
| `GET`    | `/api/v1/api-keys/:id` | Get a single API key by ID                   |
| `PUT`    | `/api/v1/api-keys/:id` | Update API key name, status, or permissions  |
| `DELETE` | `/api/v1/api-keys/:id` | Permanently delete an API key                |

#### Health

| Method | Path             | Description  |
| ------ | ---------------- | ------------ |
| `GET`  | `/api/v1/health` | Health check |

## Configuration

All environment variables are defined in `app/.env.example`. Copy it to `app/.env` and fill in the values.

| Variable            | Required | Description                                                        |
| ------------------- | -------- | ------------------------------------------------------------------ |
| `PORT`              | Yes      | API server port (default: `3000`)                                  |
| `NODE_ENV`          | Yes      | Environment mode (`development`, `production`, `test`)             |
| `DATABASE_URL`      | Yes      | PostgreSQL connection string for Prisma                            |
| `POSTGRES_USER`     | Yes      | PostgreSQL superuser name                                          |
| `POSTGRES_PASSWORD` | Yes      | PostgreSQL superuser password                                      |
| `POSTGRES_DB`       | Yes      | PostgreSQL database name                                           |
| `REDIS_URL`         | Yes      | Redis connection string (e.g. `redis://localhost:6379`)            |
| `AUTH_SECRET`       | Yes      | NextAuth secret for JWT signing and encryption (min 32 characters) |
| `ENCRYPTION_KEY`    | Yes      | AES-256 key for secret encryption (min 32 characters)              |
| `EMAIL`             | Yes      | Sender email address for transactional emails (Resend)             |
| `RESEND_API_KEY`    | Yes      | API key for the Resend email delivery service                      |
| `APP_URL`           | Yes      | Public URL of the application (e.g. `https://secryn.xyz`)          |
| `CORS_ORIGINS`      | No       | Comma-separated additional CORS origins (falls back to `APP_URL`)  |

## Project Structure

```text
secryn/
├── .github/
│   └── workflows/              # CI/CD pipelines (lint, test, Docker build, deploy)
├── app/                        # Next.js App Router (full-stack)
│   ├── prisma/                 # Database schema (models, enums, migrations)
│   ├── public/                 # Static assets (logo, manifest)
│   └── src/
│       ├── auth.ts             # NextAuth.js v5 configuration
│       ├── proxy.ts            # Edge middleware (NextAuth session check)
│       ├── app/                # App Router pages and API routes
│       │   ├── (auth)/         # Auth route group (login, register, forgot/reset password)
│       │   ├── api/            # Route handlers (auth, api-keys, projects, secrets, users, health)
│       │   │   └── auth/
│       │   │       └── [...nextauth]/  # NextAuth catch-all
│       │   └── dashboard/      # Dashboard pages (projects, api-keys, settings, api-docs, webhooks)
│       ├── components/         # common/ (EmptyState, Modal, PageHeader, SecretValue),
│       │                       # landing/ (Hero, Features, CTA, Navbar, Footer),
│       │                       # ui/ (shadcn/ui primitives, Breadcrumbs)
│       ├── data/               # Routes and shared constants
│       ├── db/                 # Prisma + Redis lazy singletons
│       ├── lib/                # Typed API client with auto-refresh and error handling
│       ├── repositories/       # Data-access layer (user, project, apiKey)
│       ├── services/           # Business logic (auth, user, project, apiKey)
│       ├── schemas/            # Zod validation schemas
│       ├── types/              # Shared TypeScript types and interfaces
│       └── utils/              # Crypto, env, email, cookie, session, serverAction wrappers
├── nginx/                      # Nginx reverse proxy
│   └── Dockerfile              # nginx:alpine container with custom config
├── nginx.conf                  # HTTP→HTTPS redirect + SSL termination + proxy to app
├── packages/
│   ├── cli/                    # Python CLI tool (sc)
│   │   ├── secryn_cli/         # CLI source (click commands, API client, config)
│   │   ├── pyproject.toml      # Python project metadata and dependencies
│   │   └── install.sh          # One-line installer script
│   ├── sdk-py/                 # Python SDK (secryn)
│   │   ├── secryn/             # SecrynClient, errors
│   │   ├── pyproject.toml
│   │   └── tests/
│   ├── sdk-ts/                 # TypeScript SDK (secryn)
│   │   ├── src/                # SecrynClient, CookieJar, types
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/                 # @repo/shared — types, DTOs, logger, and enums for app and SDKs
├── docker-compose.yml          # Production stack: PostgreSQL, Redis, App, Nginx
├── eslint.config.mjs           # ESLint flat config (TS, JSON, Markdown, CSS)
├── pnpm-workspace.yaml         # pnpm monorepo workspace definition
├── tsconfig.base.json          # Shared TypeScript compiler options
├── package.json                # Root workspace scripts and shared devDependencies
└── vitest.config.js            # Root Vitest configuration
```

## Scripts

All scripts run from the repository root via pnpm.

| Script               | Description                                   |
| -------------------- | --------------------------------------------- |
| `pnpm build`         | Build all workspace packages                  |
| `pnpm lint`          | Run ESLint across the entire monorepo         |
| `pnpm format`        | Format all files with Prettier                |
| `pnpm format:check`  | Check formatting without writing changes      |
| `pnpm typecheck`     | Run `tsc --noEmit` on all packages            |
| `pnpm test`          | Run all Vitest test suites                    |
| `pnpm test:coverage` | Run tests with coverage report                |
| `pnpm dev`           | Start Next.js dev server (port 3000)          |
| `pnpm db:generate`   | Generate Prisma client from schema            |
| `pnpm db:push`       | Push Prisma schema to the database            |
| `pnpm db:migrate`    | Create and apply a new database migration     |
| `pnpm db:studio`     | Launch Prisma Studio GUI                      |
| `pnpm docker:build`  | Build Docker images without starting services |
| `pnpm docker:up`     | Build and start all Docker Compose services   |
| `pnpm docker:dev`    | Start services in detached mode               |
| `pnpm docker:down`   | Stop and remove Docker Compose services       |
| `pnpm docker:reset`  | Stop services and remove volumes (resets DB)  |
| `pnpm docker:logs`   | Tail logs from all services                   |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
