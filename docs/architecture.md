# Architecture

Secryn is a **pnpm monorepo** with a **Next.js 16 App Router** application at its core, supported by shared types, SDKs, and a CLI tool. This document describes the system architecture, data flow, and key design decisions.

---

## Repository Structure

```text
secryn/
├── app/                         # Next.js App Router (full-stack)
│   ├── prisma/                  # Database schema (models, enums, migrations)
│   ├── src/
│   │   ├── auth.ts              # NextAuth.js v5 configuration
│   │   ├── proxy.ts             # Edge middleware (NextAuth session check)
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── (auth)/          # Auth route group (noindex metadata)
│   │   │   │   ├── login/       # Login page
│   │   │   │   ├── register/    # Register page
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   ├── dashboard/       # Protected dashboard + sub-pages
│   │   │   └── api/             # 19 route handlers
│   │   │       └── auth/
│   │   │           ├── [...nextauth]/  # NextAuth catch-all
│   │   │           ├── forgot-password/
│   │   │           └── reset-password/
│   │   ├── services/            # Business logic (auth, user, project, apiKey)
│   │   ├── repositories/        # Data access (Prisma wrappers)
│   │   ├── db/                  # Prisma + Redis lazy singletons
│   │   ├── utils/               # Crypto, env, email, cookie, session, serverAction
│   │   ├── schemas/             # Zod validation schemas
│   │   ├── errors/              # ApiError class + route error handler HOF
│   │   ├── lib/                 # Client-side API fetch helper
│   │   ├── types/               # Shared TypeScript types
│   │   ├── components/          # Shared UI (ui/, landing/)
│   │   └── template/            # HTML email templates
│   ├── Dockerfile               # Multi-stage: builder → runtime
│   └── package.json
├── packages/
│   ├── shared/                  # @repo/shared — DTOs, types, logger, enums
│   ├── sdk-ts/                  # TypeScript SDK (npm: secryn)
│   ├── sdk-py/                  # Python SDK (PyPI: secryn)
│   └── cli/                     # Python CLI (PyPI: secryn-cli, command: sc)
├── nginx/
│   └── Dockerfile               # nginx:alpine with custom config
├── nginx.conf                   # HTTP→HTTPS redirect + SSL termination
├── docker-compose.yml           # Services: db, redis, app, nginx
├── ssl/                         # TLS certificates (self-signed or Let's Encrypt)
└── docs/                        # Documentation
```

---

## Data Flow

```text
Request
  │
  ▼
NGINX (SSL termination, proxy_pass → app:3000)
  │
  ▼
Next.js Edge Middleware (proxy.ts)
  │  Calls auth() for NextAuth session check
  │  Protected pages → redirect /login              (browser)
  │  Protected API routes → 401 JSON                (API)
  │  Authenticated + auth pages → redirect /dashboard
  │
  ▼
Route Handler (app/src/app/api/**/route.ts)
  │  Wrapped in withErrorHandler() for centralized error responses
  │  Resolves authenticated user via getSessionOrThrow(await auth())
  │  Creates scoped service instance
  │
  ▼
Service Layer (app/src/services/)
  │  Business logic, authorization (PolicyProject), encryption
  │  Uses repositories for data access
  │
  ▼
Repository Layer (app/src/repositories/)
  │  Thin Prisma wrappers with typed .include shapes
  │
  ▼
Prisma Client → PostgreSQL 18
Redis (ioredis) → Rate limiting, brute-force counters
```

---

## Authentication & Authorization

### NextAuth.js v5 (Credentials Provider)

Secryn uses **NextAuth.js v5** (`app/src/auth.ts`) with a credentials provider for all user authentication:

1. **Register**: The register page calls `registerAction()` (Server Action) which creates the user via `AuthService.register()` then calls NextAuth's `signIn("credentials", ...)` to set the `jwt` session cookie
2. **Login**: The login page calls `loginAction()` (Server Action) which delegates to NextAuth's `signIn("credentials", ...)`. The `authorize()` callback in `auth.ts` validates email/password via Zod schema and `UserService`
3. **JWT Callback**: Enriches the NextAuth token with `user.id`, `user.email`, `user.username` — downstream route handlers resolve the caller via `getSessionOrThrow(await auth())` without a database round-trip
4. **Session Callback**: Maps token fields to `session.user` for middleware and client-side `useSession()`
5. **Password Reset**: `POST /auth/forgot-password` → 32-byte random token (1h expiry) → `POST /auth/reset-password`
6. **Token Refresh**: `POST /auth/refresh` extends the session

### Session Resolution

Route handlers use `getSessionOrThrow(await auth())` to resolve the authenticated user:

```typescript
// app/src/utils/session.ts
export async function getSessionOrThrow(session: Session | null): Promise<User> {
  if (!session) throw ApiError.Unauthorized();
  return session.user;
}
```

### API Key Auth (Programmatic)

- `api-key` HTTP header with `sc_` prefixed keys
- Keys encrypted at rest with AES-256-GCM
- Permission scoped: `READ`, `WRITE` (`ApiKeyPermissions` enum)
- Default 30-day expiry from creation

### Brute-Force Protection (Redis)

- Login: `failed_login:<email>` counter — 3 fails = 15-min lockout
- Anti-enumeration: dummy bcrypt for unknown emails (timing-safe)
- Forgot-password: 3 requests per 15 min per email

### Cookie Attributes

| Attribute  | Production | Development |
|------------|-----------|-------------|
| httpOnly   | true      | true        |
| secure     | true      | false       |
| sameSite   | lax       | lax         |
| name       | jwt       | jwt         |

---

## Encryption (AES-256-GCM)

```text
ENCRYPTION_KEY (env)
    │
    ▼ scrypt(N=16384, r=8, p=1, keylen=32, salt="Secryn::AES256GCM::v1")
32-byte AES key (deterministic)
    │
    ▼ createCipheriv("aes-256-gcm", key, random 12-byte IV)
ciphertext + 16-byte auth tag
    │
    ▼ stored as hex(iv):hex(tag):hex(ciphertext)
    ▼ optionally prefixed with "sc_" for API keys
```

- **Versioned salt** allows future key rotation
- Secrets encrypted **before** database storage, decrypted only after authorization
- Raw secrets never reach the database in plain text

---

## Database Schema

### Models

| Model | Table | Key Fields |
|-------|-------|-----------|
| User | `users` | id, email (unique), password (bcrypt), username (unique), role (USER/ADMIN), isVerified |
| Project | `projects` | id, name, slug (unique), ownerId, description |
| ProjectMember | `project_members` | id, userId, projectId (unique composite) |
| ProjectInvite | `project_invites` | id, projectId, slug (unique), expiresAt |
| ProjectMemberPermissionAssignment | `project_member_permission_assignments` | projectMemberId, permission (unique composite) |
| Secret | `secrets` | id, name, value (encrypted), notes, projectId |
| ApiKey | `api_keys` | id, userId, keyName, key (encrypted, unique), isActive, expiresAt |
| ApiKeyPermission | `api_key_permissions` | apiKeyId, permission (unique composite) |
| PasswordResetToken | `password_reset_tokens` | userId, token (unique), expiresAt, used |
| UserBan | `user_bans` | userId, addedBy, reason, ipAddress, isPermanent, expiresAt |

### Enums

- **UserRole**: USER, ADMIN
- **ProjectMemberPermission**: READ_SECRETS, CREATE_SECRETS, UPDATE_SECRETS, DELETE_SECRETS, CREATE_INVITES, DELETE_INVITES, MANAGE_MEMBERS, REMOVE_MEMBERS, ALL
- **ApiKeyPermissions**: READ, WRITE

### Connection

- Prisma 7 with `@prisma/adapter-pg` (direct PostgreSQL driver)
- Lazy-initialized singleton via JavaScript Proxy (prevents errors during Next.js build)
- Redis 7 for rate limiting and brute-force counters

---

## API Routes

All routes are under `/api/v1` and follow Next.js App Router conventions (`route.ts` files).

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/[...nextauth]` | NextAuth catch-all (csrf, signin, signout, session, callback) |
| POST | `/auth/[...nextauth]` | NextAuth catch-all |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Set new password via token |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get authenticated user profile |
| PUT | `/users/me` | Update profile or password |
| DELETE | `/users/me` | Delete account |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List user projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project details |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/transfer` | Transfer ownership |

### Members

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:id/members` | List project members |
| DELETE | `/projects/:id/members/:memberId` | Remove member |
| POST | `/projects/:id/members/:memberId/permissions` | Add permissions |
| DELETE | `/projects/:id/members/:memberId/permissions` | Remove permissions |

### Invites

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects/:id/invites` | Create invite |
| GET | `/projects/invites/:slug` | Accept invite |

### Secrets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:id/secrets` | List project secrets |
| POST | `/projects/:id/secrets` | Create secret |
| GET | `/projects/:id/secrets/:secretId` | Get single secret |
| PUT | `/projects/:id/secrets/:secretId` | Update secret |
| DELETE | `/projects/:id/secrets/:secretId` | Delete secret |
| GET | `/projects/:id/secrets/export` | Export as .env file |

### API Keys

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api-keys` | List user's API keys |
| POST | `/api-keys` | Create API key |
| PUT | `/api-keys/:id` | Update API key |
| DELETE | `/api-keys/:id` | Delete API key |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

---

## Frontend Architecture

### Page Hierarchy

```
RootLayout
├── Landing Page        /
├── (auth)              route group — noindex, nofollow
│   ├── Login           /login
│   ├── Register        /register
│   ├── ForgotPassword  /forgot-password
│   └── ResetPassword   /reset-password/:token
└── DashboardLayout     /dashboard
    ├── Overview         /dashboard
    ├── Projects         /dashboard/projects
    ├── API Keys         /dashboard/api-keys
    ├── API Docs         /dashboard/api-docs
    ├── Webhooks         /dashboard/webhooks
    └── Settings         /dashboard/settings
```

### Key Patterns

- **Auth**: Login/register via Server Actions wrapping NextAuth's `signIn`/`signOut` with `serverActionHandler` for typed error handling
- **Client fetch**: `apiFetch<T>(url, options)` — `credentials: "include"`, automatic 401 → refresh → retry, deduplicated concurrent refreshes
- **Auth guard**: Edge middleware (`proxy.ts`) uses `auth()` to check NextAuth session; redirects unauthenticated browser requests to `/login`, returns 401 JSON for API routes
- **Session resolution**: `getSessionOrThrow(await auth())` in route handlers provides the authenticated user with enriched fields
- **Error handling**: `ApiError` class with static factories; `withErrorHandler()` HOF wraps route handlers
- **SEO**: per-route metadata exports, JSON-LD structured data, sitemap, robots.txt
- **Styling**: Tailwind CSS v4 with CSS custom properties, dark mode via `class` strategy

---

## Infrastructure

```
                           INTERNET
                               │
                      ┌────────▼────────┐
                      │   NGINX :443    │  TLS 1.2/1.3, HTTP/2
                      │  secryn_nginx   │  reverse proxy
                      └────────┬────────┘
                               │ proxy_pass http://app:3000
                      ┌────────▼────────┐
                      │  Next.js 16 App │
                      │  secryn_app     │
                      │    :3000        │
                      └───┬───────┬─────┘
                          │       │
               ┌──────────▼──┐ ┌──▼──────────┐
               │ PostgreSQL  │ │    Redis     │
               │  18-alpine  │ │   7-alpine   │
               │  secryn_db  │ │ secryn_redis │
               └─────────────┘ └──────────────┘
```

### Docker Compose Services

| Service | Image | Internal Port | Notes |
|---------|-------|--------------|-------|
| db | postgres:18-alpine | 5432 | Healthcheck: `pg_isready` |
| redis | redis:7-alpine | 6379 | Healthcheck: `redis-cli ping` |
| app | Custom (node:22-alpine) | 3000 | Multi-stage build, internal network only |
| nginx | nginx:alpine | 80, 443 | SSL termination, HTTP→HTTPS redirect |

### NGINX Configuration

- Port 80: permanent redirect to HTTPS
- Port 443: TLSv1.2/1.3, HTTP/2, proxy to `app:3000`
- Forwarded headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- WebSocket upgrade support for HMR in dev
- `client_max_body_size: 10m`

### Deployment

- GitHub Actions workflow (`.github/workflows/deploy.yaml`) triggered on push to `main`
- SSHs into VPS → `git fetch` + `git reset --hard origin/main` → `docker compose up --build -d`
- Cloudflare for DNS and CDN

---

## SDKs & CLI

### TypeScript SDK (`packages/sdk-ts/`)

- Published as `secryn` on npm
- Internal `CookieJar` for automatic `Set-Cookie` parsing and `Cookie` injection
- Namespaced proxies: `client.auth`, `client.users`, `client.apiKeys`, `client.projects`, `client.invites`, `client.members`, `client.secrets`

### Python SDK (`packages/sdk-py/`)

- Published as `secryn` on PyPI
- Uses `requests.Session` for cookie persistence
- Same proxy pattern and resource namespaces

### CLI (`packages/cli/`)

- Published as `secryn-cli` on PyPI, command: `sc`
- Click-based command groups: `auth`, `projects`, `secrets`, `api-keys`, `user`, `config`, `version`
- Cookie persistence in `~/.config/secryn/cookies.json` (mode 0600)
- Table and JSON output modes

---

## Configuration

All environment variables defined in `app/.env.example`:

| Variable | Required | Purpose |
|----------|----------|---------|
| PORT | Yes | Server port (3000) |
| NODE_ENV | Yes | `development` / `production` (affects cookies, logging) |
| DATABASE_URL | Yes | PostgreSQL connection string |
| POSTGRES_USER | Yes | DB username |
| POSTGRES_PASSWORD | Yes | DB password |
| POSTGRES_DB | Yes | Database name |
| REDIS_URL | Yes | Redis connection string (e.g. `redis://redis:6379`) |
| AUTH_SECRET | Yes | NextAuth secret for JWT signing and encryption (min 32 chars) |
| ENCRYPTION_KEY | Yes | Master key for AES-256-GCM (min 32 chars) |
| APP_URL | Yes | Public URL (e.g. `https://secryn.xyz`) |
| CORS_ORIGINS | No | Additional CORS origins (comma-separated) |
| EMAIL | Yes | From address for transactional emails (Resend) |
| RESEND_API_KEY | Yes | Resend API key |

---

## Testing

- **Framework**: Vitest 4 + React Testing Library (jsdom)
- **Location**: `__test__/` directories co-located with source files
- **API tests**: Mocked Prisma/Redis/NextAuth dependencies, test full route handler behavior
- **Frontend tests**: Mocked `apiFetch` and Server Actions, test page rendering and user interactions
- **CI**: Single `pnpm test` runs all suites; `pnpm test:coverage` for coverage reports
