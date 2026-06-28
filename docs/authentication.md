# Authentication Guide

Secryn uses **NextAuth.js v5** with a credentials provider for user authentication, backed by **JWT sessions via httpOnly cookies**, plus **API key** support for programmatic access.

---

## Overview

| Mechanism            | Transport                     | Use Case                               |
|----------------------|-------------------------------|----------------------------------------|
| Email + Password     | NextAuth credentials          | Account creation & login               |
| JWT (httpOnly cookie)| Cookie: `jwt`                 | Web session (NextAuth-managed expiry)  |
| Password Reset       | `POST /api/auth/forgot-password` → `POST /api/auth/reset-password` | Self-service recovery |
| API Key              | Header: `api-key`             | Programmatic access                    |

---

## User Model

The `User` entity (Prisma schema at `app/prisma/models/user.prisma`):

| Field        | Type     | Description                              |
|------------- |----------|------------------------------------------|
| `id`         | cuid     | Primary key                              |
| `email`      | String   | Unique login identifier                  |
| `username`   | String   | Display name (auto-generated if omitted) |
| `password`   | String   | bcrypt hash (cost factor 12)             |
| `role`       | Enum     | `USER` or `ADMIN`                        |
| `isVerified` | Boolean  | Email verification flag                  |
| `isActive`   | Boolean  | Whether the account is active            |
| `disabledAt` | DateTime | When the account was deactivated         |
| `createdAt`  | DateTime | Account creation timestamp               |
| `updatedAt`  | DateTime | Last modification timestamp              |

---

## NextAuth.js v5 Configuration

Authentication is configured in `app/src/auth.ts` using NextAuth's `Credentials` provider:

- **Session strategy**: JWT (stateless, no database session table)
- **JWT callback**: Enriches the token with `user.id`, `user.email`, `user.username` so downstream handlers can resolve the caller's identity without a database round-trip
- **Session callback**: Maps token fields to `session.user`
- **Cookie name**: `jwt` (not the default `next-auth.session-token`)

```typescript
// app/src/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Validates email + password via Zod schema and UserService
        const { email, password } = await loginDataSchema.parseAsync(credentials);
        const userService = await UserService.Instance(null);
        const user = await userService.getUserOrThrow({ email });
        if (!(await userService.validatePassword(user.id, password))) {
          throw new Error("Invalid credentials");
        }
        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  cookies: { sessionToken: { name: "jwt" } },
});
```

---

## Registration

Registration uses a **Server Action** (`app/src/app/(auth)/actions.ts`) that wraps the legacy `AuthService.register()` via `serverActionHandler`:

```typescript
// Server Action
export const registerAction = serverActionHandler(
  async (data: { email: string; password: string; username?: string }) => {
    const authService = await AuthService.Instance(null);
    await authService.register(data);
    await signIn("credentials", { email: data.email, password: data.password, redirectTo: "/dashboard" });
  },
);
```

**Calling from the client:**

```typescript
const result = await registerAction({ email, password, username });
if (result.success) {
  // NextAuth signIn handles redirect + session cookie
} else {
  // result.error contains the error message
}
```

### Password Hashing

Passwords are hashed with **bcrypt** at **cost factor 12** before storage. The plaintext password is never persisted or logged.

### Error Responses

The `serverActionHandler` wrapper catches errors and returns a typed `ServerActionResult<T>` discriminated union with `success: false` and a human-readable `error` string.

---

## Login

Login uses a **Server Action** (`app/src/app/(auth)/actions.ts`) wrapping NextAuth's `signIn`:

```typescript
export const loginAction = serverActionHandler(
  async (email: string, password: string) => {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  },
);
```

### Flow

1. `loginAction(email, password)` is called from the login page
2. NextAuth invokes the `authorize()` callback in `auth.ts`
3. `authorize()` validates credentials via Zod schema and `UserService`
4. On success, NextAuth sets the `jwt` httpOnly cookie and redirects to `/dashboard`
5. On failure, `serverActionHandler` catches the error and returns `{ success: false, error: "..." }`

### Brute-Force Protection

Failed login tracking is handled by NextAuth internally plus Redis rate limiting:

- Counter key: `failed_login:<email>`
- **3 failed attempts** → the email is **locked for 15 minutes**
- Audit events are emitted: `LOGIN_FAILED`, `LOGIN_FAILED_UNKNOWN_EMAIL`, `LOGIN_BRUTE_FORCE_BLOCKED`

### Anti-Enumeration

When the email does **not** exist, `AuthService` computes a dummy bcrypt comparison (equalising response timing with real attempts) and increments the same rate-limit counter.

---

## Edge Middleware

Route protection is handled by Next.js Edge Middleware at `app/src/proxy.ts`:

```typescript
export async function middleware(request: NextRequest) {
  const session = await auth(); // NextAuth session check
  if (session && matchesPath(pathname, AUTH_ROUTES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!session && matchesPath(pathname, PROTECTED_ROUTES)) {
    // Page routes → redirect to /login
    // API routes → 401 JSON response
  }
}
```

### Protected Paths

- **Dashboard pages**: `/dashboard`, `/settings`, `/projects`, `/api-keys`, `/webhooks`
- **API routes**: `/api/projects`, `/api/api-keys`, `/api/secrets`, `/api/users`, `/api/webhooks`

### Auth Paths

- `/login`, `/register`, `/forgot-password` — unauthenticated only; redirect to dashboard if already logged in

### Route Handler Guard

Each protected route handler resolves the authenticated user via `getSessionOrThrow`:

```typescript
export const GET = withErrorHandler(async (_request: Request) => {
  const user = await getSessionOrThrow(await auth());
  // user.id, user.email, user.username available
});
```

`getSessionOrThrow` (`app/src/utils/session.ts`) throws `ApiError.Unauthorized()` when the session is absent.

---

## Session Management

### JWT Structure

The JWT is managed by NextAuth and contains:

```json
{
  "id": "c1e3f2a4-...",
  "email": "user@example.com",
  "name": "alice",
  "user": {
    "id": "c1e3f2a4-...",
    "email": "user@example.com",
    "username": "alice"
  }
}
```

### Cookie Transport

JWTs are transported via the `jwt` httpOnly cookie:

| Attribute  | Production | Development |
|------------|-----------|-------------|
| `httpOnly` | `true`    | `true`      |
| `secure`   | `true`    | `false`     |
| `sameSite` | `lax`     | `lax`       |
| `path`     | `/`       | `/`         |

### Token Refresh

The frontend API client (`app/src/lib/api.ts`) automatically intercepts **401 responses** and attempts a session refresh via `POST /api/auth/refresh` before retrying the original request. Concurrent refreshes are deduplicated.

### Logout

Logout uses a **Server Action** (`logoutAction`) wrapping NextAuth's `signOut`:

```typescript
export const logoutAction = serverActionHandler(async () => {
  await signOut({ redirectTo: "/login" });
});
```

The client-side dashboard calls `logoutAction()`, which clears the `jwt` cookie and redirects to `/login`.

---

## Password Reset

### Forgot Password

`POST /api/auth/forgot-password`

```json
{ "email": "user@example.com" }
```

- **Always returns `{ "ok": true }`**, regardless of whether the email exists, to prevent user enumeration
- If the email is registered, a **cryptographically random 32-byte token** is generated and persisted with a **1-hour expiry**
- An email is sent containing a reset link: `https://secryn.xyz/reset-password/<token>`
- **Rate limit:** 3 requests per 15 minutes per email address

### Reset Password

`POST /api/auth/reset-password`

```json
{
  "token": "a1b2c3d4...",
  "password": "newSecurePassword"
}
```

- Verifies the token exists, has not expired, and has not been used
- The new password is hashed with bcrypt (cost 12)
- The token is marked as **consumed** (single-use)
- Audit event: `PASSWORD_RESET`

---

## API Key Authentication

API keys provide programmatic access for CI/CD pipelines, scripts, and SDKs.

### Key Format

- Keys are prefixed with `sc_` (e.g. `sc_a1b2c3d4e5f67890...`)
- Stored as **AES-256-GCM** encrypted values (never in plaintext)
- Each key has **permissions**: `READ` or `WRITE`
- Default **30-day expiration** from creation

### Authenticating with an API Key

Include the key in the `api-key` HTTP header:

```text
GET /api/projects/abc123/secrets
api-key: sc_a1b2c3d4e5f67890...
```

### Key Management

| Endpoint        | Method | Description       |
|-----------------|--------|-------------------|
| `/api-keys`     | GET    | List all API keys |
| `/api-keys`     | POST   | Create API key    |
| `/api-keys/:id` | PUT    | Update API key    |
| `/api-keys/:id` | DELETE | Revoke API key    |

---

## Auth API Endpoints

All endpoints under `/api/auth`. Login/register/logout are handled by NextAuth's `[...nextauth]` catch-all route handler + Server Actions — they are not individual API routes.

| Method | Endpoint                 | Auth Required | Description                    |
|--------|--------------------------|:-------------:|--------------------------------|
| POST   | `/api/auth/forgot-password` | No         | Request password reset link    |
| POST   | `/api/auth/reset-password`  | No         | Set new password via token     |

NextAuth catch-all route:

| Method | Endpoint              | Description                |
|--------|-----------------------|----------------------------|
| GET    | `/auth/csrf`          | CSRF token                 |
| POST   | `/auth/callback/credentials` | Credentials sign-in  |
| POST   | `/auth/signout`       | Server-side sign-out       |
| GET    | `/auth/session`       | Get current session        |

---

## Security Features Summary

| Feature                    | Implementation                                           |
|----------------------------|----------------------------------------------------------|
| Password hashing           | bcrypt, cost factor 12                                   |
| JWT signing                | NextAuth managed, httpOnly + Secure + SameSite cookies   |
| Brute-force protection     | Redis counters — 3 fails = 15 min lockout per email      |
| Anti-enumeration           | Dummy bcrypt + rate-limited probing                      |
| Password reset tokens      | Random 32-byte, single-use, 1-hour expiry                |
| API key encryption         | AES-256-GCM with scrypt key derivation                   |
| Rate limiting              | Per-endpoint Redis counters                              |
| Audit logging              | Winston-based, all security events at info level         |
| HTTP security headers      | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| CORS                       | Explicit origin allowlist                                |

---

## Full API Reference

All endpoints are prefixed with `/api`.

| Method | Endpoint                                     | Auth Required | Description                     |
|--------|----------------------------------------------|:-------------:|----------------------------------|
| POST   | `/api/auth/forgot-password`                  | No            | Request password reset link      |
| POST   | `/api/auth/reset-password`                   | No            | Set new password via token       |
| GET    | `/api/users/me`                              | Yes           | Get authenticated user profile   |
| PUT    | `/api/users/me`                              | Yes           | Update profile or password       |
| DELETE | `/api/users/me`                              | Yes           | Delete account                   |
| GET    | `/api/projects`                              | Yes           | List user projects               |
| POST   | `/api/projects`                              | Yes           | Create project                   |
| GET    | `/api/projects/:id`                          | Yes           | Get project details              |
| PUT    | `/api/projects/:id`                          | Yes           | Update project                   |
| DELETE | `/api/projects/:id`                          | Yes           | Delete project                   |
| POST   | `/api/projects/:id/transfer`                 | Yes           | Transfer ownership               |
| GET    | `/api/projects/:id/members`                  | Yes           | List members                     |
| DELETE | `/api/projects/:id/members/:memberId`        | Yes           | Remove member                    |
| POST   | `/api/projects/:id/members/:memberId/permissions`| Yes       | Add member permissions           |
| DELETE | `/api/projects/:id/members/:memberId/permissions`| Yes       | Remove member permissions        |
| POST   | `/api/projects/:id/invites`                  | Yes           | Create invite                    |
| GET    | `/api/projects/invites/:slug`                | Yes           | Lookup invite                    |
| POST   | `/api/projects/invites/:slug/accept`         | Yes           | Accept invite                    |
| GET    | `/api/projects/:id/secrets`                  | Yes           | List project secrets             |
| POST   | `/api/projects/:id/secrets`                  | Yes           | Create secret                    |
| GET    | `/api/projects/:id/secrets/:secretId`        | Yes           | Get single secret                |
| PUT    | `/api/projects/:id/secrets/:secretId`        | Yes           | Update secret                    |
| DELETE | `/api/projects/:id/secrets/:secretId`        | Yes           | Delete secret                    |
| GET    | `/api/projects/:id/secrets/export`           | Yes           | Export as .env file              |
| GET    | `/api/api-keys`                              | Yes           | List user's API keys             |
| POST   | `/api/api-keys`                              | Yes           | Create API key                   |
| PUT    | `/api/api-keys/:id`                          | Yes           | Update API key                   |
| DELETE | `/api/api-keys/:id`                          | Yes           | Delete API key                   |
| GET    | `/api/health`                                | No            | Health check                     |

---

## Frontend Integration

### Web App (Next.js)

The frontend (`app/`) uses a typed `fetch`-based API client at `app/src/lib/api.ts` that:

- Sends all requests with `credentials: "include"` so cookies are transmitted automatically
- Intercepts **401 errors** and silently calls `POST /api/auth/refresh`
- Deduplicates concurrent refresh calls
- Redirects to `/login` if the session is truly expired

Auth pages are in `app/src/app/(auth)/` (route group with `noindex` metadata):

| Page            | Path                    |
|-----------------|-------------------------|
| Login           | `/login`                |
| Register        | `/register`             |
| Forgot Password | `/forgot-password`      |
| Reset Password  | `/reset-password/:token`|

### CLI

The CLI (`packages/cli/`) supports interactive and non-interactive login:

```bash
# Interactive
sc auth login

# Non-interactive
sc auth login --email user@example.com --password secret1234

# Check login status
sc auth whoami

# Logout
sc auth logout
```

Cookies are persisted in `~/.config/secryn/cookies.json` with `0600` permissions.

### SDKs

**TypeScript SDK** (`packages/sdk-ts/`):

```typescript
import { SecrynClient } from "secryn";

const client = new SecrynClient({ baseUrl: "https://secryn.xyz/api" });

// Login
await client.auth.login("user@example.com", "secret1234");

// Logout
await client.auth.logout();
```

The SDK includes an internal `CookieJar` class that parses `Set-Cookie` headers and injects the `Cookie` header on subsequent requests.

**Python SDK** (`packages/sdk-py/`):

```python
from secryn import SecrynClient

client = SecrynClient(base_url="https://secryn.xyz/api")

# Login
client.auth.login(email="user@example.com", password="secret1234")

# Logout
client.auth.logout()
```

---

## Environment Variables

| Variable         | Description                                   | Required |
|------------------|-----------------------------------------------|----------|
| `AUTH_SECRET`    | NextAuth secret for JWT signing + encryption  | Yes      |
| `REDIS_URL`      | Redis connection string for rate limiting     | Yes      |
| `NODE_ENV`       | `production` or `development` (affects cookies)| No      |
| `APP_URL`        | Frontend base URL (used in reset emails)      | Yes      |
| `ENCRYPTION_KEY` | Master key for AES-256-GCM encryption         | Yes      |
| `RESEND_API_KEY` | Resend API key for transactional emails       | No*      |

\* Required for forgot-password emails.
