# Authentication Guide

Secryn uses a multi-layered authentication system built on **JWT sessions via httpOnly cookies**, with optional **TOTP-based MFA** and **API key** support for programmatic access.

---

## Overview

| Mechanism          | Transport                          | Use Case                         |
|---------------------|------------------------------------|----------------------------------|
| Email + Password    | `POST /auth/register`, `POST /auth/login` | Account creation & login         |
| JWT (httpOnly cookie) | Cookie: `auth-token`              | Web session (30 min expiry)      |
| TOTP MFA            | `POST /auth/mfa/confirm`           | Second factor during login       |
| Recovery Codes      | `POST /auth/mfa/recovery`          | Bypass MFA when device lost      |
| Password Reset      | `POST /auth/forgot-password` → `POST /auth/reset-password` | Self-service recovery |
| API Key             | Header: `api-key`                  | Programmatic access to `/secrets` |
| Token Refresh       | `POST /auth/refresh`               | Silent session extension         |

---

## User Model

The `User` entity (Prisma schema at `app/prisma/models/user.prisma`):

| Field            | Type      | Description                                        |
|------------------|-----------|----------------------------------------------------|
| `id`             | UUID      | Primary key                                        |
| `email`          | String    | Unique login identifier                            |
| `username`       | String    | Display name (auto-generated if omitted)           |
| `password`       | String    | bcrypt hash (cost factor 12)                       |
| `role`           | Enum      | `USER` or `ADMIN`                                  |
| `isVerified`     | Boolean   | Email verification flag                            |
| `isMFAEnabled`   | Boolean   | Whether TOTP is active                             |
| `mfaSecret`      | String?   | Base32 TOTP secret (null if MFA disabled)          |
| `createdAt`      | DateTime  | Account creation timestamp                         |
| `updatedAt`      | DateTime  | Last modification timestamp                        |

---

## Registration

**Endpoint:** `POST /api/v1/auth/register`

Creates a new user account and returns a signed JWT set as an `httpOnly` cookie.

### Request

```json
{
  "email": "user@example.com",
  "password": "secret1234",
  "username": "alice"
}
```

- `email` — **required**. Must be a valid email address.
- `password` — **required**. Minimum 8 characters.
- `username` — *optional*. Display name; a random hex string is auto-generated when omitted.

### Password Hashing

Passwords are hashed with **bcrypt** at **cost factor 12** before storage. The plaintext password is never persisted or logged.

### Rate Limiting

- **2 requests per 30 minutes** per client IP.
- Prevents automated account creation abuse.

### Response — 200 OK

```json
{ "ok": true }
```

The `auth-token` cookie is set automatically with the following attributes:

| Attribute   | Value           |
|-------------|-----------------|
| `HttpOnly`  | `true`          |
| `Secure`    | `true` in production, `false` in development |
| `SameSite`  | `Strict`        |
| `Path`      | `/`             |
| `Max-Age`   | `1800` (30 min) |

### Error Responses

| Status | Code          | Meaning                                 |
|--------|---------------|-----------------------------------------|
| 400    | Bad Request   | Missing `email` or `password` field     |
| 409    | Conflict      | Already logged in, or email already registered |
| 500    | Internal      | Server error                            |

---

## Login

**Endpoint:** `POST /api/v1/auth/login`

Authenticates a user with email and password. The behavior depends on whether MFA is enabled on the account.

### Request

```json
{
  "email": "user@example.com",
  "password": "secret1234"
}
```

### Flow Without MFA

If the account **does not** have MFA enabled, the server returns a standard response and sets the JWT cookie:

```json
{ "ok": true }
```

### Flow With MFA (Challenge)

If the account **has** MFA enabled, the server returns an **MFA challenge** instead of setting the cookie:

```json
{
  "mfaRequired": true,
  "mfaToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

- `mfaRequired` — Always `true` when MFA is enforced.
- `mfaToken` — A **short-lived JWT (2-minute expiry)** that must be forwarded to `POST /auth/mfa/confirm` or `POST /auth/mfa/recovery` to complete authentication.

### Brute-Force Protection

Failed logins are tracked per email address in Redis:

- Counter key: `failed_login:<email>`
- **3 failed attempts** → the email is **locked for 15 minutes**.
- Audit events are emitted: `LOGIN_FAILED`, `LOGIN_FAILED_UNKNOWN_EMAIL`, `LOGIN_BRUTE_FORCE_BLOCKED`.
- On successful login, the counter is cleared.

### Anti-Enumeration

When the email does **not** exist, the server:
1. Computes a dummy bcrypt comparison (equalising response timing with real attempts).
2. Increments the same rate-limit counter.
3. Returns a generic `404 Not Found — "User"`.

This prevents attackers from discovering registered emails through timing side-channels or repeated probing.

### Rate Limiting

- **5 requests per hour** per client IP.

### Error Responses

| Status | Code              | Meaning                              |
|--------|--------------------|--------------------------------------|
| 400    | Bad Request        | Missing or invalid fields            |
| 401    | Unauthorized       | Wrong password or brute-force locked |
| 404    | Not Found          | Email not registered                 |
| 409    | Conflict           | User is already logged in            |
| 500    | Internal           | Server error                         |

---

## Multi-Factor Authentication (MFA)

Secryn implements **TOTP (Time-based One-Time Password)** as specified in RFC 6238, using **SHA-1** as the HMAC algorithm with 30-second time steps.

### Setup Flow

1. **Generate secret** — `GET /api/v1/auth/mfa/setup`  
   Returns a base32-encoded secret, a QR code data URL, and the full `otpauth://` URI.  
   The secret is stored on the user record but **not yet activated**.

   ```json
   {
     "secret": "JBSWY3DPEHPK3PXP",
     "qrCode": "data:image/png;base64,...",
     "otpauthUrl": "otpauth://totp/Secryn:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Secryn"
   }
   ```

2. **Verify and enable** — `POST /api/v1/auth/mfa/enable`  
   The user scans the QR code with their authenticator app and submits a 6-digit TOTP code.  
   If valid, MFA is activated and **10 recovery codes** are generated.

   ```json
   // Request
   { "token": "123456" }

   // Response
   {
     "ok": true,
     "recoveryCodes": ["a1b2c3d4e5f0", "6789abcdef01", ...]
   }
   ```

### Login with MFA

When MFA is enabled, login returns an MFA challenge. The client must then:

#### Option A: TOTP Code

`POST /api/v1/auth/mfa/confirm`

```json
{
  "token": "123456",
  "mfaToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

- `token` — 6-digit code from the authenticator app.
- `mfaToken` — The short-lived token from the login response.

On success, sets the full `auth-token` JWT cookie.

#### Option B: Recovery Code

`POST /api/v1/auth/mfa/recovery`

```json
{
  "code": "a1b2c3d4e5f0",
  "mfaToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

- Recovery codes are **one-time use** and stored as **HMAC-SHA256 hashes** (never in plaintext).
- Successfully using a code marks it as consumed.

### Recovery Codes

| Endpoint                                          | Description                                           |
|---------------------------------------------------|-------------------------------------------------------|
| `GET /auth/mfa/recovery-codes`                    | List available codes (masked placeholders)            |
| `POST /auth/mfa/recovery-codes/regenerate`        | Regenerate all 10 codes (invalidates previous set)    |
| `POST /auth/mfa/send-backup-code`                 | Send a backup code via email                          |

### Disable MFA

`POST /api/v1/auth/mfa/disable`

```json
{ "password": "currentPassword" }
```

Requires the current password for confirmation. Invalidates all recovery codes and clears the TOTP secret.

### Check MFA Status

`GET /api/v1/auth/mfa/status`

```json
{ "enabled": true }
```

---

## Session Management

### JWT Structure

The JWT is signed with the server's secret (`JWT_SECRET` environment variable) and contains:

```json
{
  "user": {
    "id": "c1e3f2a4-...",
    "email": "user@example.com",
    "username": "alice"
  },
  "iat": 1718123456,
  "exp": 1718125256
}
```

- **Expiry:** 30 minutes from issuance.
- **Algorithm:** HS256.

### Cookie Transport

JWTs are transported exclusively via the `auth-token` httpOnly cookie:

| Attribute       | Production  | Development  |
|-----------------|-------------|--------------|
| `httpOnly`      | `true`      | `true`       |
| `secure`        | `true`      | `false`      |
| `sameSite`      | `strict`    | `strict`     |
| `path`          | `/`         | `/`          |
| `maxAge`        | 1800s       | 1800s        |

The `secure` flag is automatically disabled in `NODE_ENV=development` to allow plain-HTTP transmission.

### Token Refresh

`POST /api/v1/auth/refresh`

Silently extends the session without re-authentication. The existing cookie must contain a valid (or recently expired) JWT.

- **Rate limit:** 30 requests per hour.
- **Response:** `{ "ok": true }` with a new `auth-token` cookie.

The frontend API client (`app/src/lib/api.ts`) automatically intercepts **401 responses** and attempts a token refresh before retrying the original request. Concurrent refreshes are deduplicated to avoid thundering-herd problems.

### Logout

`POST /api/v1/auth/logout`

Clears the `auth-token` cookie by setting it with an empty value and `maxAge: 0`.

---

## Password Reset

### Forgot Password

`POST /api/v1/auth/forgot-password`

```json
{ "email": "user@example.com" }
```

- **Always returns `{ "ok": true }`**, regardless of whether the email exists, to prevent user enumeration.
- If the email is registered, a **cryptographically random 32-byte token** is generated and persisted with a **1-hour expiry**.
- An email is sent containing a reset link: `https://yourapp.com/reset-password/<token>`.
- **Rate limit:** 3 requests per 15 minutes per email address.

### Reset Password

`POST /api/v1/auth/reset-password`

```json
{
  "token": "a1b2c3d4...",
  "password": "newSecurePassword"
}
```

- Verifies the token exists, has not expired, and has not been used.
- The new password is hashed with bcrypt (cost 12).
- The token is marked as **consumed** (single-use).
- Audit event: `PASSWORD_RESET`.

---

## API Key Authentication

API keys provide programmatic access for CI/CD pipelines, scripts, and SDKs.

### Key Format

- Keys are prefixed with `sc_` (e.g., `sc_a1b2c3d4e5f67890...`).
- Stored as **AES-256-GCM** encrypted values (never in plaintext).
- Each key has **permissions**: `READ` or `WRITE`.
- Optional **expiration date**.

### Authenticating with an API Key

Include the key in the `api-key` HTTP header:

```text
GET /api/v1/projects/abc123/secrets
api-key: sc_a1b2c3d4e5f67890...
```

**API key authentication is only supported on `/secrets` routes.** For all other endpoints, cookie-based JWT auth is required.

### Key Management

| Endpoint               | Method | Description           |
|------------------------|--------|-----------------------|
| `/api-keys`            | GET    | List all API keys     |
| `/api-keys`            | POST   | Create a new API key  |
| `/api-keys/:id`        | PATCH  | Update key metadata   |
| `/api-keys/:id`        | DELETE | Revoke an API key     |

---

## Authentication Middleware

Authentication is handled by `AuthService` (`app/src/services/auth.ts`) via a Next.js middleware that verifies JWT cookies on protected API routes.

On success, the request context provides either:
- `req.user` — `LoggedUser` (from JWT cookie), or
- `req.apiKey` — `ApiKey` (from `api-key` header, only on `/secrets` routes).

Either is available to downstream handlers and services via `AuthService.Instance()`.

---

## Security Features Summary

| Feature                        | Implementation                                         |
|--------------------------------|--------------------------------------------------------|
| Password hashing               | bcrypt, cost factor 12                                 |
| JWT signing                    | HS256, httpOnly + Secure + SameSite:Strict cookies     |
| TOTP MFA                       | RFC 6238 (SHA-1, 30s step, 6-digit codes)              |
| Recovery codes                 | HMAC-SHA256 hashed, one-time use, 10 per account       |
| Brute-force protection         | Redis counters — 3 fails = 15 min lockout per email    |
| Anti-enumeration               | Dummy bcrypt + rate-limited probing                    |
| Password reset tokens          | Random 32-byte, single-use, 1-hour expiry              |
| API key encryption             | AES-256-GCM with scrypt key derivation                 |
| Rate limiting                  | Per-endpoint Redis counters (configurable per route)   |
| Audit logging                  | Winston-based, all security events at info level       |
| HTTP security headers          | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| CORS                           | Explicit origin allowlist                              |

---

## Full API Reference

All endpoints are prefixed with `/api/v1`. Request/response schemas are documented in the OpenAPI 3.1.0 spec available at `/docs` when the API is running.

| Method | Endpoint                                     | Auth Required | Description                        |
|--------|----------------------------------------------|---------------|------------------------------------|
| POST   | `/auth/register`                             | No            | Create account                     |
| POST   | `/auth/login`                                | No            | Authenticate (or MFA challenge)    |
| POST   | `/auth/logout`                               | Yes           | Clear session                      |
| POST   | `/auth/refresh`                              | Yes           | Extend session                     |
| POST   | `/auth/forgot-password`                      | No            | Request password reset link        |
| POST   | `/auth/reset-password`                       | No            | Set new password via token         |
| GET    | `/auth/mfa/status`                           | Yes           | Check if MFA enabled               |
| GET    | `/auth/mfa/setup`                            | Yes           | Generate TOTP secret + QR code     |
| POST   | `/auth/mfa/enable`                           | Yes           | Activate MFA                       |
| POST   | `/auth/mfa/disable`                          | Yes           | Deactivate MFA                     |
| POST   | `/auth/mfa/confirm`                          | No            | Verify TOTP during login           |
| POST   | `/auth/mfa/recovery`                         | No            | Use backup recovery code           |
| GET    | `/auth/mfa/recovery-codes`                   | Yes           | List masked recovery codes         |
| POST   | `/auth/mfa/recovery-codes/regenerate`        | Yes           | Generate new recovery codes        |
| POST   | `/auth/mfa/send-backup-code`                 | Yes           | Email a backup code                |

---

## Frontend Integration

### Web App (Next.js)

The frontend (`app/`) uses a typed `fetch`-based API client at `app/src/lib/api.ts` that:

- Sends all requests with `credentials: "include"` so cookies are transmitted automatically.
- Intercepts **401 errors** and silently calls `POST /auth/refresh`.
- Deduplicates concurrent refresh calls.
- Redirects to `/login` if the session is truly expired.

Auth pages are in `app/src/app/`:

| Page                   | Path                                 |
|------------------------|--------------------------------------|
| Login                  | `/login`                             |
| Register               | `/register`                          |
| Forgot Password        | `/forgot-password`                   |
| Reset Password         | `/reset-password/:token`             |

### CLI

The CLI (`packages/cli/`) supports interactive and non-interactive login:

```bash
# Interactive
sc auth login

# Non-interactive
sc auth login --email user@example.com --password secret1234

# MFA login (prompted after email/password)
sc auth login
# Enter TOTP code: 123456

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

const client = new SecrynClient({ baseUrl: "https://secryn.xyz/api/v1" });

// Login
await client.auth.login({ email: "user@example.com", password: "secret1234" });

// MFA confirm (if required)
await client.mfa.confirm({ token: "123456", mfaToken });

// Refresh token
await client.auth.refresh();

// Check session
const authed = await client.auth.isAuthenticated();

// Logout
await client.auth.logout();
```

The SDK includes an internal `CookieJar` class that parses `Set-Cookie` headers and injects the `Cookie` header on subsequent requests.

**Python SDK** (`packages/sdk-py/`):

```python
from secryn import SecrynClient

client = SecrynClient(base_url="https://secryn.xyz/api/v1")

# Login
client.auth.login(email="user@example.com", password="secret1234")

# Logout
client.auth.logout()
```

---

## Environment Variables

| Variable          | Description                                    | Required |
|-------------------|------------------------------------------------|----------|
| `JWT_SECRET`      | HS256 signing key for JWT tokens               | Yes      |
| `REDIS_URL`       | Redis connection string for rate limiting      | Yes      |
| `NODE_ENV`        | `production` or `development` (affects cookies)| No       |
| `APP_URL`         | Frontend base URL (used in reset emails)       | Yes      |
| `RESEND_API_KEY`  | Resend API key for transactional emails        | No*      |

\* Required for forgot-password and MFA backup code emails.
