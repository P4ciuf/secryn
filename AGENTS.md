# Secryn — AGENTS.md

## Project overview

Secryn is a self-hosted secrets management platform that stores and exposes API keys, tokens, and environment variables through a web dashboard, a REST API, a CLI, and two SDKs. It runs as a pnpm monorepo with a Next.js App Router application at the core, Python and TypeScript SDKs, and a Python CLI tool.

- **Latest release tag:** `v3.1.0` (app version `3.1.0`)
- **SDK versions:** `secryn` (TS) `1.0.4`, `secryn` (Python) `1.0.2`, `secryn-cli` `0.1.2`

## Repository structure

```text
secryn/
├── .github/workflows/
│   ├── ci.yaml              # CI: App (Next.js), CLI (Python), SDK Python, SDK TS
│   ├── deploy.yaml          # Deploy to VPS on push to main
│   ├── publish-cli.yaml     # Publish CLI to PyPI on cli-v* tags
│   ├── publish-sdk-py.yaml  # Publish Python SDK to PyPI on py-v* tags
│   └── publish-sdk-ts.yaml  # Publish TS SDK to npm on ts-v* tags
├── app/                     # Next.js App Router full-stack application
│   ├── prisma/
│   │   ├── schema.prisma    # Entry point (composes models/ and enums/)
│   │   ├── models/          # User, Project, Secret, ApiKey, etc.
│   │   ├── enums/           # UserRole, ProjectMemberPermission, ApiKeyPermissions
│   │   └── migrations/      # Prisma migration history
│   ├── src/
│   │   ├── app/             # App Router pages and API route handlers
│   │   │   ├── (auth)/      # Login, register, forgot/reset password, verify
│   │   │   ├── api/         # Route handlers: auth, api-keys, projects, secrets, users, health
│   │   │   └── dashboard/   # Dashboard: projects, api-keys, settings, api-docs
│   │   ├── components/      # UI primitives (shadcn/ui), landing components, auth components
│   │   ├── db/              # Prisma + Redis lazy singletons
│   │   ├── lib/             # Typed API client (apiFetch with auto-refresh)
│   │   ├── repositories/    # Data-access layer (user, project, apiKey)
│   │   ├── services/        # Business logic (auth, user, project, apiKey)
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── types/           # Shared TypeScript types
│   │   ├── utils/           # Crypto, env, email, cookie, session helpers
│   │   ├── template/        # HTML email templates
│   │   └── errors/          # Error classes
│   ├── scripts/             # Standalone cron scripts (tsx)
│   ├── Dockerfile           # Multi-stage Next.js build
│   ├── entrypoint.sh        # Container entrypoint (cron + Prisma push + Next.js)
│   └── next.config.ts       # Security headers, image config, compression
├── cli/                     # Python CLI tool (sc)
│   ├── secryn_cli/
│   │   ├── cli.py           # Click commands (auth, projects, secrets, api-keys)
│   │   ├── client.py        # HTTP client (requests.Session, cookie persistence)
│   │   ├── config.py        # Config/cookie file I/O
│   │   ├── tests/
│   │   ├── __init__.py
│   │   └── __main__.py
│   ├── pyproject.toml        # Version 0.1.2, click + requests
│   ├── install.sh
│   ├── Makefile
│   └── README.md
├── packages/
│   ├── sdk-py/              # Python SDK (secryn)
│   │   ├── secryn/
│   │   │   ├── client.py    # SecrynClient with namespaced proxies
│   │   │   ├── errors.py    # SecrynApiError
│   │   │   ├── tests/
│   │   │   └── __init__.py  # Version 1.0.2
│   │   └── pyproject.toml   # requests, requires-python >=3.10
│   ├── sdk-ts/              # TypeScript SDK (secryn)
│   │   ├── src/
│   │   │   ├── client.ts    # SecrynClient with native fetch + CookieJar
│   │   │   ├── types.ts
│   │   │   └── logger.ts
│   │   ├── package.json     # Version 1.0.4, published to npm
│   │   └── tsconfig.json
│   └── shared/              # @repo/shared (private)
│       ├── src/
│       │   ├── dtos/        # Shared DTOs
│       │   ├── entities/    # Entity types
│       │   ├── enums/
│       │   ├── errors/
│       │   ├── utils/       # Winston logger
│       │   └── pagination/
│       └── package.json     # Winston deps, built with tsc
├── nginx/
│   ├── Dockerfile           # nginx:alpine reverse proxy
│   └── nginx.conf           # HTTP→HTTPS redirect, SSL termination, proxy to app:3000
├── docker-compose.yml       # PostgreSQL 18, Redis 7, Next.js app, nginx
├── eslint.config.mjs        # ESLint flat config (TS, JSON, Markdown, CSS)
├── prettier.config          # Double quotes, semicolons, trailing commas, 100 width
├── tsconfig.base.json       # Shared TS config (strict, ESNext target)
├── vitest.config.js         # Root Vitest config
└── pnpm-workspace.yaml      # Workspaces: app, packages/*
```

## Tech stack (by package)

### `app/` — Next.js App Router (full-stack)

| Layer           | Technology                                                                      |
| --------------- | ------------------------------------------------------------------------------- |
| Runtime         | Node.js 22+                                                                     |
| Framework       | Next.js 16.2.9 (App Router, webpack)                                            |
| Language        | TypeScript (root: 6.0.3, app tsconfig targets ES2017)                           |
| Package manager | pnpm 11.5.0 (Corepack + `packageManager` field enforced)                        |
| ORM             | Prisma 7.8.0, PostgreSQL 18 via `@prisma/adapter-pg`                            |
| Cache / Session | Redis 7 via `ioredis` 5.11.1                                                    |
| Auth            | NextAuth.js 5.0.0-beta.31 (credentials provider, JWT strategy, `jwt` cookie)    |
| Email           | Resend 6.12.4                                                                   |
| UI              | React 19.2.4, Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react, framer-motion |
| Testing         | Vitest 4.1.7, Testing Library, jsdom                                            |
| Linting         | ESLint 10.4.1 (flat config), Prettier 3.8.3                                     |
| Validation      | Zod 4.4.3                                                                       |
| Crypto          | `jose` 6.2.3, `bcrypt` 6.0.0                                                    |
| Cron            | Container-level crond (busybox), not in-app cron                                |

### `cli/` — Python CLI

| Layer         | Technology                       |
| ------------- | -------------------------------- |
| Runtime       | Python >=3.10                    |
| CLI framework | Click >=8.0                      |
| HTTP client   | requests >=2.28                  |
| Linting       | ruff >=0.11                      |
| Type checking | mypy >=1.0                       |
| Testing       | pytest >=8.0, pytest-mock >=3.14 |
| Version       | 0.1.2                            |

### `packages/sdk-py/` — Python SDK

| Layer       | Technology      |
| ----------- | --------------- |
| Runtime     | Python >=3.10   |
| HTTP client | requests >=2.28 |
| Version     | 1.0.2           |

### `packages/sdk-ts/` — TypeScript SDK

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Runtime  | Node.js 22+                         |
| Language | TypeScript 6.0.3                    |
| Version  | 1.0.4, published to npm as `secryn` |

## Setup commands

```bash
# Enable Corepack + install all dependencies
corepack enable
pnpm install

# Create and configure environment files
cp app/.env.example app/.env   # Then edit app/.env with valid values

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d db redis

# Generate Prisma client + push schema
pnpm db:generate
pnpm db:push

# Run every service locally (app + infra)
docker compose up --build
```

## Dev environment

- **Start Next.js dev server:** `pnpm dev` (runs `pnpm --filter app dev`, port 3000)
- **Docker helpers:**
  - `pnpm docker:dev` — start all services in detached mode
  - `pnpm docker:reset` — stop and wipe volumes (resets DB)
  - `pnpm docker:logs` — tail all container logs
- **Prisma commands:**
  - `pnpm db:generate` — regenerate Prisma client
  - `pnpm db:push` — push schema without a migration
  - `pnpm db:migrate` — create and apply a migration
  - `pnpm db:studio` — open Prisma Studio
- **Python projects:** The CLI lives at `cli/`, the SDK at `packages/sdk-py/`. Each has its own `pyproject.toml`. Install in editable mode:
  ```bash
  pip install -e cli/
  pip install -e packages/sdk-py/
  ```
- **Workspace layout:** pnpm workspaces: `app`, `packages/*`. The `@repo/shared` package provides shared types and the Winston logger.

## Build commands

```bash
# Build the Next.js app (production)
pnpm --filter app build

# Build @repo/shared (required before typecheck/test)
pnpm --filter @repo/shared build

# Build the TS SDK
cd packages/sdk-ts && pnpm build

# Build the Python SDK / CLI (sdist + wheel)
cd packages/sdk-py && python -m build
cd cli && python -m build

# Full CI pipeline (what GitHub Actions runs):
pnpm lint
pnpm format:check
pnpm db:generate
pnpm --filter @repo/shared build
pnpm typecheck
pnpm --workspace-concurrency=1 test
pnpm --filter app build
docker compose build
```

## Testing

```bash
# Run all test suites (Vitest for TS, pytest for Python)
pnpm test

# Run app tests in watch mode
pnpm --filter app test:watch

# Run CLI tests
cd cli && python -m pytest secryn_cli/tests/ -v

# Run Python SDK tests
cd packages/sdk-py && python -m pytest secryn/tests/ -v

# Run a single test file (Vitest)
pnpm --filter app exec vitest --run src/app/api/health/__test__/route.test.ts

# Run with coverage
pnpm test:coverage
```

Test files are co-located with source modules under `__test__/` directories. Route handler tests mock Prisma, Redis, and NextAuth. Page tests mock `apiFetch` and Server Actions. Python tests use `pytest-mock`.

## Code style

- **ESLint:** Flat config at `eslint.config.mjs`. Covers TypeScript, JSON, Markdown, and CSS. Runs type-aware (`projectService: true`). Enforces `@typescript-eslint/no-unused-vars` (prefix unused args with `_`).
- **Prettier:** Config in `.prettierrc`. Double quotes, semicolons, trailing commas, 100-char print width, 2-space tabs.
- **TypeScript:** Strict mode. Root tsconfig targets ESNext; app tsconfig targets ES2017 (DOM lib). Packaged SDKs have inlined tsconfigs.
- **Python:** Ruff for linting (rules unspecified — default), mypy for type checking.
- **Pre-commit hook:** Husky runs `lint-staged`, which auto-fixes ESLint + Prettier on staged `*.{ts,tsx,js,jsx}` files and Prettier on `*.{css,json,md,yaml,yml}` files.
- **Conventional Commits:** Required per `CONTRIBUTING.md`. Format: `<type>(<scope>): <description>`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`. Scopes: `app`, `cli`, `sdk-py`, `sdk-ts`, or more specific (`auth`, `prisma`, `docker`, etc.).

## Environment variables

Copy `app/.env.example` to `app/.env`. Required variables:

| Variable         | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `PORT`           | Server port (default 3000)                       |
| `NODE_ENV`       | `development` / `production` / `test`            |
| `DATABASE_URL`   | PostgreSQL connection string                     |
| `REDIS_URL`      | Redis connection string                          |
| `AUTH_SECRET`    | NextAuth JWT signing key (min 32 chars)          |
| `ENCRYPTION_KEY` | AES-256 key for secret encryption (min 32 chars) |
| `EMAIL`          | Sender address for Resend                        |
| `RESEND_API_KEY` | Resend API key                                   |
| `APP_URL`        | Public app URL                                   |
| `CORS_ORIGINS`   | Additional CORS origins (optional)               |

Root `.env.example` (used by Docker Compose) only sets PostgreSQL credentials.

## Security

- Passwords hashed with bcrypt (6 rounds).
- JWT signed with `jose` via NextAuth, stored in httpOnly `jwt` cookie.
- Secrets encrypted at rest with AES-256-GCM.
- Security response headers set in `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- API routes return `Cache-Control: no-store, must-revalidate` and `X-Robots-Tag: noindex, nofollow`.
- Rate limiting via Redis (login, API key creation, password reset, etc.).
- CORS restricted to explicit allowlist.
- Audit logging for security events (login, secret CRUD, password changes) at `info` level with `[AUDIT]` prefix.
- Static files cached for 1 year (`immutable`).
- Prisma uses `@prisma/adapter-pg` for prepared statements.

## CI/CD

- **CI:** Four parallel jobs in `.github/workflows/ci.yaml` — App (Next.js lint/format/typecheck/test/build), CLI (ruff/mypy/pytest), SDK Python (ruff/mypy/pytest), SDK TS (build/typecheck). Runs on push/PR to `main`.
- **Deploy:** `.github/workflows/deploy.yaml` — SSH into VPS, fetch+reset, preserve `.env`, `docker compose up --build -d`, prune images. Runs on push to `main` or `workflow_dispatch`. Depends on all CI jobs passing.
- **Publish CLI:** `.github/workflows/publish-cli.yaml` — triggered by `cli-v*` tags or manual dispatch. Builds and publishes to PyPI via OIDC trusted publishing.
- **Publish SDK Python:** `.github/workflows/publish-sdk-py.yaml` — triggered by `py-v*` tags or manual dispatch.
- **Publish SDK TS:** `.github/workflows/publish-sdk-ts.yaml` — triggered by `ts-v*` tags or manual dispatch. Publishes to npm.

## Branches and PR convention

Per `CONTRIBUTING.md`:

- Branch prefixes: `feature/`, `fix/`, `chore/`, `refactor/`, `release/`.
- PR titles follow Conventional Commits (e.g. `feat(api): add project invite email notifications`).
- Squash-merge to `main`. The merge commit title becomes the final commit message.
- Run `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` before opening a PR.

## Discrepancies found during audit

The following items differ between documentation and the actual repository state:

1. **CLI location — README vs reality:** The README and `CONTRIBUTING.md` describe the CLI at `packages/cli/`. It was moved to `cli/` (root level) in a recent refactor. The `publish-cli.yaml` workflow still references `packages/cli/` paths and will fail on tag-based publishes until updated.

2. **TypeScript version mismatch:** The root `package.json` declares `"typescript": "^6.0.3"`, but `app/package.json` pins `"typescript": "^5"`. The app's `tsconfig.json` targets `ES2017` while the base config targets `ESNext`. This appears intentional (app uses the v5 toolchain installed in its own `node_modules`).

3. **README project structure:** The directory tree in the README shows `packages/cli/` as the CLI location (stale), and lists the repo structure as seen from before the refactor commits.

4. **`publish-cli.yaml` stale paths:** Uses `working-directory: packages/cli` and `packages-dir: packages/cli/dist/`. The working directory should be `cli` and the packages dir `cli/dist/`.
