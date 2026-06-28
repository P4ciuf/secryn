# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
## [3.1.0]

### Added
- Email verification token generation in `AuthService.sendVerificationEmail` — a random 32-byte hex token is stored in Redis (72 h TTL) and embedded in the verification URL, replacing the previous tokenless `/verify` link (`app/src/services/auth.ts`)
- Token validation in `AuthService.verifyAccount` — accepts a `token` parameter and validates it against Redis before marking the account as verified; invalid or expired tokens are rejected (`app/src/services/auth.ts`)
- `VerifyButton` now receives a `token` prop forwarded to `verifyAccountAction` via `VerifyButtonProps` interface (`app/src/components/auth/verifyButton.tsx`)
- `resendVerificationEmailAction` Server Action sourcing the user's email from the session and delegating to `AuthService.sendVerificationEmail` (`app/src/app/(auth)/actions.ts`)
- Unverified-account warning banner in the dashboard layout — shown when `isVerified` is false, includes a 72‑hour deletion notice and a "Resend verification email" button wired to `resendVerificationEmailAction` (`app/src/app/dashboard/layout.tsx`)
- Test suite for `DashboardLayout` (10 tests): sidebar rendering, active route highlighting, user email fetch, unverified banner visibility, logout, sidebar toggle, and resend-verification-email (`app/src/app/dashboard/__test__/layout.test.tsx`)
<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
- Missing test scenarios added across 7 route handler test files: 403 forbidden paths (invites, permissions, secrets), 404 not-found paths (members, secrets, invites/accept), 409 email-conflict (users/me), 400 wrong-password (users/me), and 500 internal-error paths (api-keys/[id]) (`app/src/app/api/**/__test__/route.test.ts`)
- Python test suites for the CLI package: `Client` (HTTP methods, URL building, error handling, cookie persistence, logout) and `Config` (directory resolution, load/save round-trips, cookie file I/O) (`packages/cli/secryn_cli/tests/`)
- JSDoc documentation for `resendVerificationEmailAction`, `verifyAccountAction` (`@param token`), `registerAction` (`@throws`), `VerifyButton`/`VerifyButtonProps`, `AuthService.Instance`, `sendVerificationEmail` (`@param to`), `verifyAccount` (`@param token`, `@throws`), `forgotPassword` (`@param`, `@returns`), `resetPassword` (`@param`, `@returns`), `DashboardLayout` (full component description), `isActive`, and `handleLogout` (`app/src/`)
<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
- Test files for 5 auth layout components (forgot-password, login, register, reset-password, verify/[token]) covering transparent child rendering and noindex/nofollow metadata (`app/src/app/(auth)/**/__test__/layout.test.tsx`)
- Test file for root `RootLayout` (10 tests) covering child rendering, HTML/body attributes, JSON-LD structured data, viewport config, and exports (metadata, OpenGraph, Twitter, robots, icons) (`app/src/app/__test__/layout.test.tsx`)
- Test file for `NotFound` page (2 tests) covering 404 heading and home-page link (`app/src/app/__test__/not-found.test.tsx`)
- `isActive` (boolean, default true) and `disabledAt` (nullable DateTime) fields to `User` model for soft-disabling accounts (`app/prisma/models/user.prisma`)
- `UserReactivationCode` model with unique `userId`, unique `code`, `expiresAt`, and `usedAt` fields — stores one-time reactivation tokens sent to deactivated users; each user can have at most one pending code (`app/prisma/models/user.prisma`)
- `updateUsers` bulk-update repository method returning the count of affected rows (`app/src/repositories/user.ts`)
- `createUserReactivationCode`, `consumeUserReactivationCode`, and `findUserReactivationCode` repository methods for reactivation code lifecycle management (`app/src/repositories/user.ts`)
- `getUsers` service method returning all users matching a Prisma filter; `updateUsers` bulk service method for batch operations restricted to non-sensitive fields (`app/src/services/user.ts`)
- `disableUser` service method: sets `isActive` to false, records `disabledAt`, generates a 30-day reactivation token stored via `UserReactivationCode`, and sends a deactivation email with a reactivation link (`app/src/services/user.ts`)
- `disableUsers` bulk service method: disables all users matching a Prisma filter via `disableUser` delegation (`app/src/services/user.ts`)
- `activateUser` service method: sets `isActive` to true, clears `disabledAt`, and sends a welcome-back email (`app/src/services/user.ts`)
- `activateUsers` bulk service method: reactivates all users matching a Prisma filter via `activateUser` delegation (`app/src/services/user.ts`)
- Cron job `disableUnverifiedUsersAfter7Days` — standalone TypeScript script executed by cron (via `tsx`), running daily at midnight UTC to disable accounts created more than 7 days ago with unverified email, protected by a Redis distributed lock with 1-hour TTL deadlock prevention (`app/scripts/disableNotVerifiedUsers.ts`)
- Account deactivation email template (`accountDeactivation.html`) with reactivation link, 30-day expiry notice, and dark-theme styling (`app/src/template/accountDeactivation.html`)
- Account reactivation email template (`accountReactivation.html`) with login link and dark-theme styling (`app/src/template/accountReactivation.html`)
- Prisma migration `20260627134231_add_user_reactivation_fields_and_model` adding `is_active` / `disabled_at` columns to `users` and creating `user_reactivation_codes` table with unique indexes and cascade foreign key (`app/prisma/migrations/`)
- Container entrypoint script (`app/entrypoint.sh`) that starts crond (busybox), registers an hourly disable-unverified-users cron job, pushes the Prisma schema, and launches Next.js as PID 1 for graceful Docker signal handling (`app/entrypoint.sh`)

### Changed
- `AuthService.sendVerificationEmail` visibility changed from `private` to `public` to support the resend-verification flow (`app/src/services/auth.ts`)
- Rewrote 7 page/component test suites with expanded coverage: `ForgotPasswordPage` (loading state, link hrefs), `RegisterPage` (success redirect, password-too-short validation, loading, username-as-undefined), `ResetPasswordPage` (password validation, success navigation, API payload), `DashboardPage` (empty-state counts, recent projects, card links, Secured card), `ApiKeysPage` (error state, create flow with one-time key view, toggle enable/disable), `ProjectsPage` (error state, create submit, delete), `SecretsPage` (error state, toggle visibility, create/update/delete, back-to-projects link) (`app/src/app/**/__test__/page.test.tsx`)
- `verifyAccountAction` test now passes an explicit token argument matching the updated signature (`app/src/app/(auth)/__test__/actions.test.ts`)
- `verifyAccountAction` body simplified to call `authService.verifyAccount(userId, token)` directly after inline session extraction (`app/src/app/(auth)/actions.ts`)
- Dashboard layout test expanded (now 16 tests) with coverage for `isLoadingUser` guard (redirect suppressed until fetch completes), unverified-user redirect from API Keys page to dashboard, disabled nav items with `aria-disabled="true"`, and absence of redirect for verified users (`app/src/app/dashboard/__test__/layout.test.tsx`)
- Dashboard layout JSDoc expanded with `isLoadingUser` state tracking and unverified-redirect behavior description (`app/src/app/dashboard/layout.tsx`)
- Root layout JSDoc: added `@param children`, expanded JSON-LD description to list all three schema.org entities (Organization, WebSite, SoftwareApplication) (`app/src/app/layout.tsx`)
- Dockerfile: replaced inline `CMD` with a dedicated `ENTRYPOINT` script that manages cron via busybox crond and database schema push before starting Next.js (`app/Dockerfile`, `app/entrypoint.sh`)
- tsconfig: added `scripts/**/*.ts` and `scripts/**/*.mts` to include paths so standalone cron scripts are type-checked (`app/tsconfig.json`)
- pnpm-workspace: added `esbuild` to allowed builds for `tsx` compatibility (`pnpm-workspace.yaml`)
- JSDoc documentation added to `UserRepository` public methods: `createUser`, `findUser`, `updateUser`, `findUsers`, `deleteUser`, `findPasswordResetToken`, `createPasswordResetToken`, and `consumePasswordResetToken` (`app/src/repositories/user.ts`)
- JSDoc documentation added to `BCRYPT_ROUNDS` constant and Prisma field comments for `isActive` and `disabledAt` (`app/src/services/user.ts`, `app/prisma/models/user.prisma`)

### Fixed
- Verify page test moved from `verify/__test__/` to `verify/[token]/__test__/` and rewritten to handle the page as an async server component that awaits `params` (`app/src/app/(auth)/verify/[token]/__test__/page.test.tsx`)

### Removed
- `verify/page.tsx` and `verify/layout.tsx` — flat verify page without a dynamic `token` route segment, replaced by the existing server component at `verify/[token]/page.tsx` (`app/src/app/(auth)/verify/`)
- Italian inline comment from dashboard layout (redundant `useEffect` guard note describing `isLoadingUser` return) (`app/src/app/dashboard/layout.tsx`)
- Redundant section-marker HTML comments (Header, Body, CTA Button, Info box, Divider, Footer) from project invitation email template (`app/src/template/projectInvitation.html`)
- `node-cron` dependency — in-app cron scheduling replaced by container-level crond (busybox) invoked via the entrypoint script (`app/package.json`, `app/entrypoint.sh`)
- `scripts/disable-unverified-users.sh` — host-level shell script using `docker compose exec` replaced by container-internal crond + entrypoint (`app/entrypoint.sh`)
- `app/src/jobs/disableNotVerifiedUsers.ts` — in-app `cron.schedule`-based job replaced by a standalone script at `app/scripts/disableNotVerifiedUsers.ts` (`app/scripts/disableNotVerifiedUsers.ts`)

<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
## [3.0.0] - 2026-06-26

### Added
- NextAuth.js v5 configuration (`app/src/auth.ts`) with credentials provider, JWT session strategy (cookie named `jwt`), and callbacks that enrich the token with user payload (id, email, username) for downstream route handlers
- `[...nextauth]` catch-all route handler (`app/src/app/api/auth/[...nextauth]/route.ts`) delegating GET/POST to NextAuth
- `getSessionOrThrow` utility (`app/src/utils/session.ts`) resolving the authenticated user from a NextAuth session and throwing `401` when absent — replaces the old `getAuthenticatedUser` guard
- `serverActionHandler` wrapper (`app/src/utils/serverAction.ts`) catching errors from Server Actions and returning a typed `ServerActionResult` discriminated union — handles Zod validation errors, NextAuth `AuthError` unwrapping, and Next.js redirect digest preservation
- `ServerActionResult<T>` discriminated union type (`app/src/types/serverAction.ts`) for success/error outcomes from Server Actions
- `loginDataSchema` Zod schema (`app/src/schemas/user.ts`) validating email + password (min 8 chars) for the credentials provider
- `loginAction`, `registerAction`, `logoutAction` Server Actions (`app/src/app/(auth)/actions.ts`) wrapping NextAuth's `signIn`/`signOut` with `serverActionHandler`
- Proxy middleware (`app/src/proxy.ts`) redirecting unauthenticated users away from protected page/API routes and authenticated users away from auth pages — uses NextAuth session check via `auth()`
- Generalized cookie utilities: `setCookie`, `getCookie`, `getCookieOrThrow`, `clearCookie` (`app/src/utils/cookie.ts`) replacing the old `setAuthCookie` — accepts arbitrary cookie names and `SerializeOptions`
- Auth pages reorganized into `(auth)/` route group with per-route layout metadata (`robots: noindex,nofollow`) for login, register, forgot-password, and reset-password pages
- Test suite for `[...nextauth]` route handler (4 tests) covering GET/POST delegation and error propagation
- Test suite for login page (5 tests) covering form render, login failure, redirect on success, links, and Enter submission
- Test suite for settings page (10 tests) covering loading skeleton, profile CRUD, password change validation, account deletion, and load-failure fallback
- Documentation comments added to 10 previously undocumented exports across route handlers, services, utilities, and type definitions

### Changed
- All 16 API route handlers (`app/src/app/api/**/route.ts`) migrated from `getAuthenticatedUser(request)` + `ApiError.Unauthorized()` to `getSessionOrThrow(await auth())` with `as string` type casts on `user.id`
- `ProjectService`: all `this.user.id` accesses typed with `as string` throughout create/delete/update/transfer/member/permissions/secret methods
- `UserService`: simplified class description and constructor, removed `UserRepository` type import, removed all MFA lifecycle methods (setupMFA, enableMFA, disableMFA, verifyTOTP, consumeRecoveryCode, getRecoveryCodes, regenerateRecoveryCodes, sendBackupCodeEmail, activeMFA) and their helper imports (otplib, qrcode)
- `UserRepository`: removed `mfaRecoveryCodes` eager-load from `FullUser` type — now includes only `bans`
- `cookie.ts`: renamed `setAuthCookie` to `setCookie` (generalized to any cookie name/value with `SerializeOptions`), split `clearCookie` from it, added `getCookie` and `getCookieOrThrow`
- `redis.ts`: removed commented-out MFA email backup code functions (`storeEmailBackupCode`, `consumeEmailBackupCode`)
- `users/me/route.ts`: DELETE handler now calls `clearCookie("jwt")` using the generalized utility instead of the old `clearAuthCookie`
- Dashboard layout: logout uses `logoutAction()` Server Action instead of direct `apiFetch`; imports updated to `@/app/(auth)/actions`
- Settings page: integrated `Breadcrumbs` and `PageHeader` components; added `UserProfile` interface for typed API responses
- `packages/shared/src/dtos/auth.ts`: removed 6 MFA-specific DTO interfaces (LoginMFAResponse, MFAConfirmBody, MFARecoveryBody, MFASetupResponse, MFAEnableBody, MFAStatusResponse, MFARecoveryCodesResponse) and RegisterBody
- `packages/shared/index.ts`: barrel exports updated to remove MFA types
- `packages/shared/src/utils/logger.ts`: reworded `audit` method description to remove MFA reference
- Python SDK (`packages/sdk-py/secryn/client.py`): removed `_MFAProxy` class (setup, enable, disable, confirm, recovery, status, recoveryCodes, regenerateCodes, sendBackupCode) and its instance wiring from `SecrynClient`
- TypeScript SDK (`packages/sdk-ts/src/client.ts`): removed MFA-specific type imports and MFA auth methods; simplified `auth.login` return type to `{ ok: boolean }`
- TypeScript SDK types (`packages/sdk-ts/src/types.ts`): removed 8 MFA-related interfaces (LoginMFAResponse through MFARecoveryCodesResponse)
- Python SDK README and TypeScript SDK README updated
- Prisma enum documentation: added inline comments distinguishing `MANAGE_MEMBERS` from `REMOVE_MEMBERS` permissions
- `docker-compose.yml`: env_file paths updated from `.env` to `./app/.env`

### Fixed
- Settings page test: ambiguous `findByText("Settings")` replaced with `findByRole("heading")` to handle duplicate "Settings" text from Breadcrumbs and PageHeader

### Removed
- All 9 MFA API route handlers and their test suites (setup, enable, disable, confirm, recovery, status, recovery-codes, regenerate-codes, send-backup-code) under `app/src/app/api/auth/mfa/`
- Legacy auth route handlers and their test suites: login, register, logout, refresh under `app/src/app/api/auth/`
- Legacy `getAuthenticatedUser` auth guard utility (`app/src/utils/authGuard.ts`)
- Legacy JWT service (`app/src/services/jwt.ts`)
- Legacy middleware (`app/src/middleware.ts`) — replaced by `app/src/proxy.ts` with NextAuth session checks
- Old auth pages and their test suites at flat routes: login, register, forgot-password, reset-password under `app/src/app/`
- `_MFAProxy` class from Python SDK (9 proxy methods dropped)
- MFA DTO interfaces from `@repo/shared` and `@secryn/sdk-ts`
- Prisma migration `20260625000000_drop_mfa_columns_and_table` dropping `mfaSecret` column from User and the `MFARecoveryCode` table

## 2026-06-18

### Added
- Next.js App Router application under `app/` replacing the separate `apps/api` (Fastify) and `apps/web` (Vite+React) with a unified full-stack framework — Prisma ORM, AES-256-GCM encryption, JWT cookie auth, MFA TOTP, API keys, password reset, project/secret CRUD, Tailwind CSS v4, and landing page (`app/src/`)
- Next.js patterns to `.gitignore`: `.next/`, `/out/`, `next-env.d.ts` (`.gitignore`)
- Comprehensive JSDoc documentation across 62 files: all 30 route handlers (method, path, auth requirements, error codes), 12 page components, 6 service classes (AuthService, UserService, ApiKeyService, ProjectService, JwtService, CryptoUtils), 2 repository classes, 5 utility modules, 3 UI components (PageHeader, Modal, EmptyState), type exports, Next.js middleware, and API client (`app/src/`)
- 164 vitest tests across 41 test files covering all 30 API route handlers (auth, MFA, api-keys, projects, secrets, invites, users, health) with mocked dependencies and all 11 dashboard/auth page components with mocked API client (`app/src/**/__test__/`)
- `vitest` (v4.1.7), `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom` dev dependencies for frontend/backend test suites (`app/package.json`)
- `vitest.config.ts` with `@/` and `@repo/shared` path alias resolution matching the Next.js/tsconfig setup; `vitest.setup.ts` for jest-dom matchers (`app/vitest.config.ts`, `app/vitest.setup.ts`)
- Dockerfile documentation header describing the multi-stage build intent (`app/Dockerfile`)
- SEO infrastructure: `robots.ts` generator blocking AI-training crawlers (GPTBot, Claude, PerplexityBot) while allowing Google-Extended for AI search features; `sitemap.ts` with public route entries (landing, login, register) (`app/src/app/robots.ts`, `app/src/app/sitemap.ts`)
- Per-route layout files for auth pages (login, register, forgot-password, reset-password) with `robots: noindex,nofollow` metadata to prevent search engines from indexing authentication pages (`app/src/app/*/layout.tsx`)
- Static assets: `logo.png` and `manifest.webmanifest` for PWA manifest and favicon/icon references in root metadata (`app/public/`)
- `Breadcrumbs` UI component with accessible `<nav>`, `aria-label="Breadcrumb"`, separator rendering, link-vs-plain-text logic for the current (last) page, and JSON-LD `BreadcrumbList` structured data for search engine breadcrumb enrichment (`app/src/components/ui/breadcrumbs.tsx`)
- Breadcrumbs integrated into dashboard, api-keys, projects, secrets, and settings pages with contextual breadcrumb trails (Dashboard, Dashboard > Projects > Project Name, etc.)
- Test suite for `Breadcrumbs` covering empty state, single item, multi-item links, three-level hierarchy, and JSON-LD schema validation (`app/src/components/ui/__test__/breadcrumbs.test.tsx`)
- Test suite for the root landing page covering nav, hero, sections, CTA, footer, and metadata export (`app/src/app/__test__/page.test.tsx`)
- nginx reverse proxy service in `docker-compose.yml` with ports 80/443, `./ssl` volume mount, and `secryn_nginx` container (`docker-compose.yml`)
- `nginx.conf` — HTTP→HTTPS redirect on port 80, TLSv1.2/1.3 SSL server block on port 443 proxying to Next.js app on port 3000 with forwarded headers and WebSocket upgrade support (`nginx.conf`)
- `nginx/Dockerfile` — nginx:alpine container copying the custom nginx configuration (`nginx/Dockerfile`)

### Changed
- `package.json` scripts consolidated: removed `dev:api`, `dev:web`, `test:api`, `test:web`; added single `dev` targeting `app` workspace; db scripts (`generate`, `push`, `migrate`, `studio`) retargeted from `api` to `app` (`package.json`)
- `pnpm-workspace.yaml` workspace packages updated from `apps/*` to `app`; added `sharp` to allowed builds for Next.js image optimization (`pnpm-workspace.yaml`)
- Dockerfile CMD changed from `pnpm prisma:push` to `npx prisma db push` for production runtime compatibility; added `COPY app/src ./app/src` for source inclusion (`app/Dockerfile`)
- `docker-compose.yml`: renamed containers (`db` → `secryn_db`, `redis` → `secryn_redis`, `api` → `secryn_app`); consolidated separate `api` and `web` services into a single `app` Next.js service on port 3000 (`docker-compose.yml`)
- `app/tsconfig.json`: fixed `@repo/shared` path alias from `index.ts` to directory reference for proper workspace resolution (`app/tsconfig.json`)
- Root layout (`layout.tsx`): enhanced with OpenGraph metadata, Twitter card, manifest link, icon references, and JSON-LD structured data for Organization, WebSite, and SoftwareApplication entities to improve Knowledge Graph and social-sharing previews (`app/src/app/layout.tsx`)
- Landing page (`page.tsx`): added page-level SEO metadata export (canonical URL, OpenGraph card) (`app/src/app/page.tsx`)
- `next.config.ts`: added security response headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, X-DNS-Prefetch-Control), API-layer `X-Robots-Tag: noindex,nofollow` and `Cache-Control: no-store`, static asset long-lived caching (`Cache-Control: public, max-age=31536000, immutable`), gzip compression, and experimental tree-shaking optimization for lucide-react and framer-motion (`app/next.config.ts`)
- Dashboard page tests updated to mock the new `Breadcrumbs` component across 5 test files: dashboard, api-keys, projects, secrets, and settings (`app/src/app/dashboard/**/__test__/page.test.tsx`)
- Auth pages: inline comments added documenting `router.refresh()` for RSC payload re-fetch after login/registration, OTP digit-stripping in MFA flow, `username || undefined` fallback to omit empty fields, and noindex behavior in page JSDoc headers (`app/src/app/forgot-password/page.tsx`, `app/src/app/login/page.tsx`, `app/src/app/register/page.tsx`, `app/src/app/reset-password/[token]/page.tsx`)
- JSDoc documentation added to private interfaces (`ApiKeyData`, `Project`, `Secret`, `ProjectInfo`, `UserProfile`, `DashboardData`, `ProjectSummary`, `ApiKeySummary`) and exported `BreadcrumbItem` across page and component files
- `.gitignore` — Added `ssl/` directory exclusion to prevent committing TLS certificates (`.gitignore`)
- `docker-compose.yml` — Replaced direct app port exposure (`3000:3000`) with nginx reverse proxy on ports 80 and 443; app service is now internal to the Docker network (`docker-compose.yml`)
- `.env` — Updated `APP_URL` and `CORS_ORIGINS` from `http://localhost:5173` to `https://secryn.xyz`; set `NODE_ENV` to `production` (`.env`)

### Fixed
- Python SDK test `test_default_base_url` updated to expect `https://secryn.xyz/api/v1` matching the production base URL (`packages/sdk-py/secryn/tests/test_client.py`)
- Web `ApiKeysPage` test assertion updated to expect uppercase `["READ", "WRITE"]` permissions matching the re-added `.toUpperCase()` client-side normalization (`apps/web/src/features/api-keys/__tests__/ApiKeysPage.test.tsx`)
- Dashboard sidebar: Overview navigation button no longer stays in active state on sub-pages — `isActive()` now uses exact-match for the dashboard root path (`app/src/app/dashboard/layout.tsx`)
- `ApiKeyService` constructor: parameter type changed from `User | null` to `User` (non-nullable) to reflect that the service is always scoped to an authenticated user (`app/src/services/apiKey.ts`)
- `AuthService.authenticateRequest()`: removed unreferenced `ApiKey` entity type import to satisfy unused-variable TypeScript checking (`app/src/services/auth.ts`)
- `Secret` entity: `createdAt`/`updatedAt` type changed from `Date` to `string` in Prisma type definitions to match JSON serialization in API responses (`app/src/repositories/project.ts`)
- `Secret` repository: `findManySecrets` parameter from `ProjectWhereUniqueInput` to `SecretWhereInput` for correct type usage (`app/src/services/project.ts`)
- `@prisma/client` import: `Secret` type reference removed in favor of inline `where` type for dead-code elimination (`app/src/services/project.ts`)
- Settings page test: ambiguous `findByText("Settings")` replaced with `findByRole("heading", { name: "Settings", level: 1 })` to handle the duplicate "Settings" text introduced by the new Breadcrumbs component (`app/src/app/dashboard/settings/__test__/page.test.tsx`)
- Cloudflare Error 521 (Web Server Down) — origin server was not listening on port 443 after the Next.js rewrite removed nginx SSL termination; restored nginx as a reverse proxy handling HTTPS and proxying to the Next.js app on port 3000 (`docker-compose.yml`, `nginx.conf`, `nginx/Dockerfile`)

### Removed
- `apps/api/` — Fastify backend application migrated into Next.js App Router API routes; all routes, services, repositories, Prisma schema, migrations, email templates, type declarations, utilities, and test suites deleted from the old location (~130 files)
- `apps/web/` — Vite+React frontend application migrated into Next.js App Router pages and components; all components, pages, hooks, layouts, styles, data modules, and test suites deleted from the old location (~250 files)

## 2026-06-14

### Changed
- SDK versions bumped: Python SDK to 1.0.2 (`packages/sdk-py/pyproject.toml`), TypeScript SDK from 1.0.3 to 1.0.4 (`packages/sdk-ts/package.json`)
- SDK tsconfig inlined: removed `extends: "../../tsconfig.base.json"` and duplicated all compilerOptions directly for standalone npm packaging — `target`, `strict`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `resolveJsonModule`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedModules` (`packages/sdk-ts/tsconfig.json`)
- SDK default base URL updated from `http://localhost:3000` / `https://api.secryn.xyz` to `https://secryn.xyz` across Python SDK client default, Python SDK README, TypeScript SDK client default, TypeScript SDK README, and CLI `--api-url` help text (`packages/sdk-py/secryn/client.py`, `packages/sdk-py/README.md`, `packages/sdk-ts/src/client.ts`, `packages/sdk-ts/README.md`, `packages/cli/secryn_cli/cli.py`)
- `ApiKeysPage` create handler: client-side `.toUpperCase()` on permissions re-added with explicit `ApiKeyPermission` type cast to ensure server receives uppercase permission values (`apps/web/src/features/api-keys/ApiKeysPage.tsx`)
- API key decryption: strip `sc_` prefix before AES-256-GCM decryption, re-prepend `sc_` after decrypting for correct display (`apps/api/src/core/apiKeys/service.ts`)
- Web `ApiKeyRow`: use `SecretValue` `maskedPrefix="sc_"` prop to show the `sc_` prefix in the masked API key display (`apps/web/src/features/api-keys/components/ApiKeyRow.tsx`)
- TS SDK README: use `sc_` prefix in API key code example (`packages/sdk-ts/README.md`)
- Version constants in Python source files synced: SDK `__version__` from 1.0.0 to 1.0.2, CLI `__version__` from 0.1.1 to 0.1.2 (`packages/sdk-py/secryn/__init__.py`, `packages/cli/secryn_cli/__init__.py`, `packages/cli/secryn_cli/__main__.py`)
- API package version bumped to 1.0.4 (`apps/api/package.json`)

### Fixed
- `publish-sdk-ts.yaml`: fixed npm publish command from `pnpm publish --no-git-checks` to `npm publish --access public` with OIDC authentication for correct npm registry publishing (`.github/workflows/publish-sdk-ts.yaml`)

## 2026-06-13

### Added
- `.github/workflows/deploy.yaml` — Automatic deploy workflow triggered on push to `main` or manual dispatch; SSHs into VPS, pulls latest changes, rebuilds with `docker compose up --build -d`, and prunes old Docker images (`.github/workflows/deploy.yaml`)
- HTTPS support with SSL: nginx configured with HTTP→HTTPS redirect on port 80, TLSv1.2/1.3 SSL server block on port 443 with `secryn.xyz` server name and certificate chain; docker-compose maps port 443 and mounts `./ssl` volume as read-only (`apps/web/nginx.conf`, `docker-compose.yml`)

### Fixed
- Deploy workflow: replaced `git pull origin main` with `git fetch origin main` + `git reset --hard origin/main` to prevent merge conflicts during automated VPS deployment (`.github/workflows/deploy.yaml`)

## 2026-06-12

### Added
- `docs/authentication.md` — Authentication guide documenting JWT sessions via httpOnly cookies, TOTP-based MFA, API keys, password reset, token refresh, and recovery code flows (`docs/authentication.md`)

### Changed
- Python SDK: cleaned up unused imports (`Dict` from `client.py`, `Optional` from `errors.py`) and removed dead variable in test suite (`packages/sdk-py/`)

## 2026-06-11

### Added
- `docs/todo.md` — Project roadmap moved from root into docs directory (`docs/todo.md`)
- Python SDK package under `packages/sdk-py/` with `SecrynClient` HTTP client wrapping `requests.Session`, proxy sub-objects for all API resource groups (auth, MFA, users, API keys, projects, invites, members, secrets), `SecrynApiError` exception class with structured error fields, and 92-test pytest suite covering all proxy methods, HTTP error codes, and edge cases (`packages/sdk-py/secryn/client.py`, `packages/sdk-py/secryn/errors.py`, `packages/sdk-py/secryn/tests/test_client.py`)
- TypeScript SDK package under `packages/sdk-ts/` with `SecrynClient` using native `fetch`, internal `CookieJar` for Node.js cookie persistence across requests, namespaced proxy sub-objects, `SecrynApiError` exception class, and debug-gated logger (`packages/sdk-ts/src/client.ts`, `packages/sdk-ts/src/types.ts`, `packages/sdk-ts/src/logger.ts`)
- `packages/shared/src/utils/logger.ts` — Shared Winston logger utility with daily-rotate-file transport, ANSI-coloured console output per log level, `exitOnError: false` graceful degradation, and structured `audit()` method for security-relevant events (`packages/shared/src/utils/logger.ts`)
- SDK CI GitHub Actions workflows: `sdk-py-ci.yaml` (ruff lint, mypy type-check, pytest), `sdk-ts-ci.yaml` (ESLint, tsc typecheck, vitest), `publish-sdk-py.yaml` (build sdist/wheel, verify tag, OIDC PyPI publish), and `publish-sdk-ts.yaml` (npm publish) (`.github/workflows/`)
- `apps/api/.vscode/settings.json` — Workspace-specific VS Code configuration for TypeScript SDK path (`apps/api/.vscode/settings.json`)
- Python CLI package under `packages/cli/` with Click-based commands for authentication, project/secret CRUD, API key management, `.env` export, and JSON output — supports cookie-based auth, MFA login flow, interactive prompts, and `--api-url` persistence (`packages/cli/secryn_cli/cli.py`, `packages/cli/secryn_cli/client.py`, `packages/cli/secryn_cli/config.py`)
- CLI test suite with 54 test cases covering all commands, Click group behavior, API error handling, connection errors, MFA login flow, confirmation prompts, JSON output, masked values, and `main()` entry-point error routing (`packages/cli/secryn_cli/tests/test_cli.py`)
- CLI one-line installer shell script with automatic pipx/pip/venv fallback, Python version check, and config directory creation (`packages/cli/install.sh`)
- CLI CI GitHub Actions workflow: ruff lint, mypy type-check, pytest with 54 tests on push/PR to `packages/cli/**` (`.github/workflows/cli-ci.yaml`)
- Test suites for web common components: `EmptyState` (render, table wrapper, empty message), `Modal` (open/closed states, backdrop click, internal-click isolation, maxWidth), `PageHeader` (title, subtitle, primary/secondary actions, back link, router integration), `SecretValue` (masked/visible toggle, clipboard copy, custom prefix) (`apps/web/src/components/common/__tests__/`)
- Test suites for web landing components: `FeaturesSection` (heading, 4 feature cards, grid layout), `LandingFooter` (copyright, tagline, footer element), `HeroSection` (heading, subtitle, CTA links, gradient text, router integration) (`apps/web/src/components/landing/__tests__/`)
- API Key system: Prisma models (`ApiKey`, `ApiKeyPermission`), enum (`ApiKeyPermissions`), repository, and service with AES-256-GCM key encryption, key prefixing (`sc_`), 30-day expiry, and `verifyKey` validation (`apps/api/src/core/apiKeys/repository.ts`, `apps/api/src/core/apiKeys/service.ts`, `apps/api/prisma/models/apiKey.prisma`, `apps/api/prisma/enums/apiKey.prisma`)
- API Key REST API routes under `apps/api/src/routes/apiKey/` with full OpenAPI schema documentation and JWT authentication:
  - `POST /api-keys` — generate a new API key (rate-limited to 5 req/30 min)
  - `GET /api-keys/:id` — retrieve a key by ID, or all user keys via `@all-user` (rate-limited to 50 req/h)
  - `PUT /api-keys/:id` — update name, active status, and/or permissions with diff-based add/remove (rate-limited to 5 req/h)
  - `DELETE /api-keys/:id` — permanently delete a key (rate-limited to 5 req/h)
- Test suites for all 4 API key routes covering 201/200/204/400/401/404/500 scenarios (`apps/api/src/routes/apiKey/__tests__/`)
- Password reset Prisma model (`PasswordResetToken`) with 1-hour expiry and consumed flag (`apps/api/prisma/models/passwordResetToken.prisma`)
- Password reset REST routes with Swagger schema documentation:
  - `POST /auth/forgot-password` — initiate reset; always returns ok to prevent email enumeration (rate-limited to 3 req/15 min per email)
  - `POST /auth/reset-password` — reset password with single-use token (rate-limited to 5 req/15 min)
- Test suites for forgot-password and reset-password routes covering 200/400/401/500 scenarios (`apps/api/src/routes/auth/__tests__/forgot-password.test.ts`, `apps/api/src/routes/auth/__tests__/reset-password.test.ts`)
- `GET /projects/:projectId/secrets/export` route returning project secrets as a downloadable `.env` file with `Content-Disposition` header (rate-limited to 5 req/5 min) (`apps/api/src/routes/project/secrets/export.route.ts`)
- Test suite for secrets export route covering 200/401/403/404/500 scenarios (`apps/api/src/routes/project/secrets/__tests__/export.test.ts`)
- `ForgotPasswordPage` frontend component with email submission and anti-enumeration UI (always shows "check your inbox") (`apps/web/src/features/auth/ForgotPasswordPage.tsx`)
- `ResetPasswordPage` frontend component with client-side validation (min 8 chars, password match, token presence) (`apps/web/src/features/auth/ResetPasswordPage.tsx`)
- `EditApiKeyModal` frontend component with permission diffing — computes add/remove deltas against original key permissions (`apps/web/src/features/api-keys/components/EditApiKeyModal.tsx`)
- Test suites for `ForgotPasswordPage`, `ResetPasswordPage`, and `EditApiKeyModal` covering render, loading, error, success, and interaction states (`apps/web/src/features/auth/__tests__/`, `apps/web/src/features/api-keys/components/__tests__/`)
- Forgot-password email HTML template (`apps/api/src/modules/user/email/forgotPassword.html`)
- `@fastify/swagger` schemas (summary, description, operationId, tags, params, body, response) for all 4 API key routes, both password reset routes, and secrets export route
- `apiKey` and `passwordResetTokens` relations to `User` Prisma model
- Database migrations for `ApiKey`, `ApiKeyPermission` tables and `PasswordResetToken` table
- `PrismaConfig` with config-based schema path and migration directory (`apps/api/prisma.config.ts`)
- CLI PyPI publish GitHub Actions workflow triggered by `cli-v*` tags or manual dispatch — builds sdist + wheel with `python -m build`, verifies tag matches `__version__`, and publishes via OIDC Trusted Publishing (`.github/workflows/publish-cli.yaml`)
- README documentation for Python SDK, TypeScript SDK, and CLI packages with full usage guides, proxy method references, and command references (`packages/sdk-py/README.md`, `packages/sdk-ts/README.md`, `packages/cli/README.md`)
- Repository and homepage URLs to Python SDK and CLI `pyproject.toml` files for PyPI metadata (`packages/sdk-py/pyproject.toml`, `packages/cli/pyproject.toml`)

### Changed
- SDK packages bumped to 1.0.1 — Python SDK (`pyproject.toml`) and TypeScript SDK (`package.json`) (`packages/sdk-py/pyproject.toml`, `packages/sdk-ts/package.json`)
- Extracted `winston` and `winston-daily-rotate-file` from API dependencies to `@repo/shared` dependencies; added `export * from "./src/utils/logger.js"` to shared barrel exports (`apps/api/package.json`, `packages/shared/package.json`, `packages/shared/index.ts`)
- Fixed PostgreSQL volume mount path in `docker-compose.yml` from `/var/lib/postgresql/data` to `/var/lib/postgresql` (`docker-compose.yml`)
- `.gitignore` — Excluded `*` glob under `.vscode/` while unignoring specific `apps/api/.vscode/settings.json` and `apps/web/.vscode/settings.json` for per-app VS Code configuration (`.gitignore`)
- Updated 10 API source files to import `logger` from `@repo/shared` instead of local `../../core/logger/index.js` as part of logger extraction to shared package (`apps/api/src/core/auth/service.ts`, `apps/api/src/core/db/prisma.ts`, `apps/api/src/core/errors/errorHandler.ts`, `apps/api/src/main.ts`, `apps/api/src/modules/project/service.ts`, `apps/api/src/modules/user/service.ts`, `apps/api/src/routes/project/core/get.route.ts`, `apps/api/src/utils/email.ts`, `apps/api/src/utils/loader.ts`, `apps/api/src/utils/redis.ts`)
- `README.md` — Added CLI section with install instructions (pipx, venv, one-liner script), full command reference for auth/projects/secrets/api-keys, and tech-stack row (`README.md`)
- `.gitignore` — Replaced generic 738-line boilerplate with 45-line project-specific entries covering Python (`__pycache__`, `*.egg-info`, `.venv`), Node (`node_modules`, `dist`, `coverage`, `*.tsbuildinfo`), IDE, OS, Docker, and environment files (`.gitignore`)
- `todo.md` — Marked "Secret retrieval endpoints" and "CLI planning" as completed (`todo.md`)
- `cli.py` — Expanded `main()` docstring documenting pre-processing, exception-handling strategy, and exit-code semantics; added explanatory comment for `pyrefly: ignore` directive (`packages/cli/secryn_cli/cli.py`)
- `install.sh` — Added file-level header block (description, usage, dependencies, exit codes) and per-function doc blocks (`packages/cli/install.sh`)
- API Dockerfile: `prisma generate` added before build for generated client (`apps/api/Dockerfile`)
- API key inline permission rejection comments added to 4 secret route handlers — documenting that API keys scoped to "read" only are rejected on write endpoints (`apps/api/src/routes/project/secrets/create.route.ts`, `apps/api/src/routes/project/secrets/get.route.ts`, `apps/api/src/routes/project/secrets/gets.route.ts`, `apps/api/src/routes/project/secrets/update.route.ts`)
- `ApiKeyRow` updated with edit button (Pencil icon) wiring to `EditApiKeyModal` (`apps/web/src/features/api-keys/components/ApiKeyRow.tsx`)
- `ApiKeysPage` wired to `EditApiKeyModal` with `PUT /api-keys/:id` update handler and optimistic local-state refresh (`apps/web/src/features/api-keys/ApiKeysPage.tsx`)
- Router paths updated: `/forgot-password` and `/reset-password/:token` routes added; `FORGOT_PASSWORD` and `RESET_PASSWORD` path constants added (`apps/web/src/routes.ts`, `apps/web/src/routes/paths.ts`)
- `LoginPage` "Forgot password?" link now resolves to `ROUTES.FORGOT_PASSWORD` (`apps/web/src/features/auth/LoginPage.tsx`)
- `SecretsPage` export handler uses `API_BASE_URL` for direct `fetch` of dotenv blob (bypasses JSON-typed API client) (`apps/web/src/features/projects/SecretsPage.tsx`)
- `CreateApiKeyInput` DTO type added to `@repo/shared` with `name` and `permissions` fields; `UpdateApiKeyInput` DTO added with optional `name`, `isActive`, `addPermissions`, `removePermissions` (`packages/shared/src/dtos/api-key.ts`)
- `ForgotPasswordBody` and `ResetPasswordBody` DTO types added to `@repo/shared` (`packages/shared/src/dtos/auth.ts`)
- `ApiKey` and `ApiKeyPermission` entity types added to `@repo/shared` barrel exports (`packages/shared/src/entities/api-key.ts`, `packages/shared/index.ts`)
- JSDoc added across 11 backend files: `ApiKeyRepository` class, `ApiKeyService` (class, `Instance`, `SystemInstance`, `normalizeApiKey`, `generateApiKey`, `updateApiKeyPermissions`, `verifyKey`), `UpdateApiKeyInput` DTO, `ForgotPasswordBody`/`ResetPasswordBody` DTOs, `MFAStatusResponse` DTO, and 4 API key route factory exports
- Fixed misplaced JSDoc in auth DTOs — recovery codes response comment moved from `ForgotPasswordBody` to `MFARecoveryCodesResponse` (`packages/shared/src/dtos/auth.ts`)
- JSDoc added across 5 frontend files: `handleUpdate` and `deleteKey` in `ApiKeysPage`, `EditApiKeyModal` component and `handleSubmit` permission-diffing logic, `ForgotPasswordPage` anti-enumeration behavior, `ResetPasswordPage` validation flow, `handleExport` in `SecretsPage` (`apps/web/src/features/`)
- `ApiKeyService` instance imported from `apiKeys/service.js` in `AuthService.authenticateRequest` — API keys are resolved via `api-key` header for `/secrets` endpoints (`apps/api/src/core/auth/plugin.ts`, `apps/api/src/core/auth/service.ts`)
- `loggedUser` type exported from fastify type declarations alongside module augmentation (`apps/api/src/types/fastify.d.ts`)
- Mock API key data updated with `ApiKey` entity fields: `id`, `keyName`, `key`, `userId`, `isActive`, `permissions`, `createdAt`, `updatedAt`, `expiresAt` (`apps/web/src/data/api-keys.ts`)
- `PageHeader` component extended with `secondaryAction` prop for supplementary buttons (e.g. export) (`apps/web/src/components/common/PageHeader.tsx`)
- `SecretValue` component `maskedPrefix` prop made configurable with default `"••"` (`apps/web/src/components/common/SecretValue.tsx`)
- Added `forgot-password` and `reset-password` test mocks to `api-keys` data test (`apps/web/src/data/__tests__/api-keys.test.ts`)
- Full project rebranding from **SecureVault** to **Secryn** across all layers (~55 files): package name in `package.json`, Python package renamed to `secryn-cli` with `secryn_cli/` module directory, environment variables (`SECRYN_API_URL`, `SECRYN_HOME`), Docker volume/network names (`secryn_db`, `secryn_net`, `secryn_redis`), API key prefix (`sc_`), CLI binary renamed from `sv` to `sc` (entry point, `pyproject.toml`, `install.sh`, `Makefile`), config directory (`~/.config/secryn/`), Prisma schema doc headers, encryption SALT, OTP issuer, email templates (`APP_NAME`), landing page branding, and inline references across all `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `todo.md`, and source files
- Renamed TypeScript SDK package from `@secryn/sdk` to `secryn`; updated all import paths, install instructions, npm badges, and README references across SDK and root documentation (`packages/sdk-ts/package.json`, `packages/sdk-ts/README.md`, `README.md`)
- Renamed root workspace name from `secryn` to `secryn-monorepo` and marked as `private: true` to prevent accidental npm publish and avoid workspace name collision with SDK package (`package.json`)

### Fixed
- CLI: `main()` now uses `e.exit_code` instead of `e.code` for Click exception handling (`packages/cli/secryn_cli/cli.py`)
- CLI: Cookie type annotations improved from `Optional[dict]` to `Optional[list[dict[str, Any]]]` (`packages/cli/secryn_cli/config.py`)
- CLI: Version bumped to 0.1.1 (`packages/cli/pyproject.toml`, `packages/cli/secryn_cli/`)
- Web: Removed client-side `.toUpperCase()` on API key permissions in create/update handlers — server enforces casing (`apps/web/src/features/api-keys/ApiKeysPage.tsx`)
- API: Suppressed error logging in test environment (`NODE_ENV=test`) to reduce noise during test runs (`apps/api/src/core/errors/errorHandler.ts`)
- CI workflow fixes: `publish-sdk-py.yaml` and `publish-cli.yaml` now read version from `pyproject.toml` via grep/sed instead of Python import (avoids `ModuleNotFoundError`); `sdk-ts-ci.yaml` and `publish-sdk-ts.yaml` use `working-directory` instead of `pnpm --filter` for reliable workspace builds; `sdk-py-ci.yaml` missing `pytest` step added to run the 92-test SDK suite (`.github/workflows/`)

### Removed
- `todo.md` (root) — Project roadmap consolidated into `docs/todo.md`
- `.vscode/settings.json` (root) — VS Code workspace settings consolidated into per-app directories (`apps/api/.vscode/settings.json`)
- `apps/api/src/core/logger/index.ts` — Winston logger module moved to `@repo/shared` as `packages/shared/src/utils/logger.ts`; all API modules now import logger from shared package (`apps/api/src/core/logger/index.ts`)

## 2026-06-10

### Added
- Client-side secret search and filtering in `SecretsTable` with case-insensitive name matching, clear button, and contextual empty-state messages (`apps/web/src/features/projects/SecretsPage.tsx`, `apps/web/src/features/projects/components/SecretsTable.tsx`)

### Changed
- Search bar in `SecretsTable` only renders when the project already contains secrets (`apps/web/src/features/projects/components/SecretsTable.tsx`)
- Marked "Search and filtering" as completed in `todo.md` (`todo.md`)

### Fixed
- Resolved React version mismatch in web test suite by aligning `react` with `react-dom` to 19.2.7 (`apps/web/package.json`, `pnpm-lock.yaml`)

## 2026-06-08

### Security
- Transitive dependency vulnerability CVE-2026-39406 resolved: `@hono/node-server` forced to >=1.19.13 (resolved to 2.0.4) via `pnpm-workspace.yaml` overrides, fixing middleware bypass via repeated slashes in `serveStatic`

### Changed
- Updated frontend dependencies: `vite` (8.0.12 → 8.0.16), `react-dom` (19.2.6 → 19.2.7), `react-router` (7.16.0 → 7.17.0), `react-hook-form` (7.77.0 → 7.78.0) (`apps/web/package.json`)
- `todo.md`: marked "Dependency vulnerability scanning" as completed

## 2026-06-07

### Security
- JWT authentication hardened: `authenticate` preHandler now cryptographically verifies JWT signatures via `verifyAndDecodeToken()` instead of decoding without verification (`apps/api/src/core/auth/plugin.ts`, `apps/api/src/core/auth/service.ts`)
- CORS restricted: replaced permissive `origin: true` with explicit allowlist (`APP_URL` default + optional `CORS_ORIGINS` env var) to prevent cross-origin credential leakage (`apps/api/src/main.ts`, `apps/api/src/utils/env.ts`)
- Cross-project authorization fixed: `deleteSecret`, `updateSecret`, `getSecret`, `getProjectSecrets` now resolve the secret first then verify project-scoped membership, preventing users with permissions in one project from accessing secrets in another (`apps/api/src/modules/project/service.ts`)
- Encryption key derivation upgraded from SHA-256 to scrypt (N=131,072 iterations) for resistance against brute-force attacks on weak passphrases (`apps/api/src/utils/crypto.ts`)
- HTML injection prevented: invitee email is now HTML-escaped before interpolation into the invitation email template (`apps/api/src/modules/project/service.ts`)
- Host port mappings removed from `docker-compose.yml` for PostgreSQL (5432) and Redis (6379) — services are now internal to the Docker network (`docker-compose.yml`)
- Client-side JWT storage removed: `auth_token` no longer written to or read from `localStorage`; authentication is exclusively cookie-based (`apps/web/src/lib/api.ts`, `apps/web/src/features/dashboard/components/Sidebar.tsx`, `apps/web/src/features/dashboard/components/MobileSidebar.tsx`)
- Password minimum length enforced server-side: `minLength: 8` added to login and register route JSON schemas (`apps/api/src/routes/auth/login.route.ts`, `apps/api/src/routes/auth/register.route.ts`)
- MFA brute-force protection tightened: TOTP confirmation and recovery code rate limits reduced from 10 to 3 attempts per 5 minutes; recovery route now cryptographically verifies MFA tokens via `jwt.verify` instead of `jwt.decode` (`apps/api/src/routes/auth/mfa/confirm.route.ts`, `apps/api/src/routes/auth/mfa/recovery.route.ts`)
- Audit logging added: `logger.audit()` records security events (login success/failure, brute-force lockout, MFA enable/disable, secret CRUD, password change) at `info` level with `[AUDIT]` prefix for log aggregation (`apps/api/src/core/logger/index.ts`, `apps/api/src/core/auth/service.ts`, `apps/api/src/modules/project/service.ts`, `apps/api/src/modules/user/service.ts`)
- Plaintext secret logging removed: debug log lines that exposed decrypted secret values in `getProjectSecrets` and `getUserProjects` deleted (`apps/api/src/modules/project/service.ts`)

### Changed
- `getProject` now returns `null` (instead of throwing) when the user is not a member or owner; authorization is checked against both membership and ownership (`apps/api/src/modules/project/service.ts`)
- Comprehensive JSDoc added across 17 files: `@param`, `@returns`, `@throws`, `@since`, `@see`, `@deprecated` tags; audit event documentation; architectural decision comments; TOTP plugin rationale; fixed-salt explanation; CORS optionality docs (`apps/api/src/core/auth/plugin.ts`, `apps/api/src/core/auth/service.ts`, `apps/api/src/core/logger/index.ts`, `apps/api/src/main.ts`, `apps/api/src/modules/project/service.ts`, `apps/api/src/modules/user/service.ts`, `apps/api/src/routes/auth/mfa/confirm.route.ts`, `apps/api/src/routes/auth/mfa/recovery.route.ts`, `apps/api/src/utils/crypto.ts`, `apps/api/src/utils/env.ts`, `apps/web/src/features/dashboard/components/Sidebar.tsx`, `apps/web/src/features/dashboard/components/MobileSidebar.tsx`, `apps/web/src/lib/api.ts`)
- `verifyAndDecodeToken()` added to `AuthService` — combines JWT verification and user extraction in one operation, eliminating the window where an unverified token could be trusted (`apps/api/src/core/auth/service.ts`)
- `activeMFA()` method in `UserService` documented as `@deprecated` — kept for internal compatibility; replaced by `setupMFA` + `enableMFA` TOTP flow (`apps/api/src/modules/user/service.ts`)

## 2026-06-06

### Changed
- Extended ioredis type declarations with `pipeline()` and `multi()` method signatures and comprehensive JSDoc documenting the module purpose and method cross-references (`apps/api/src/types/ioredis.d.ts`)
- Extended `AuthService` with brute-force rate limiting via Redis pipeline counter, `DUMMY_HASH` for timing-safe unknown-email checks, and `incrementFailedLogin` helper for atomic counter operations (`apps/api/src/core/auth/service.ts`)

## 2026-06-05

### Added
- MFA REST API routes under `apps/api/src/routes/auth/mfa/` with full OpenAPI schema documentation and JWT authentication:
  - `GET /auth/mfa/setup` — generate a TOTP secret and QR code data URL for MFA enrollment
  - `POST /auth/mfa/enable` — verify a TOTP code and activate MFA, returning 10 single-use plaintext recovery codes
  - `POST /auth/mfa/disable` — disable MFA, clear the stored secret, and delete all recovery codes
  - `POST /auth/mfa/confirm` — verify a TOTP code during MFA-gated login, returning the final auth JWT
  - `POST /auth/mfa/recovery` — authenticate with a backup recovery code during MFA-gated login
  - `POST /auth/mfa/send-backup-code` — email a one-time backup code to the user for emergency access
  - `GET /auth/mfa/status` — check whether MFA is currently enabled on the account
  - `GET /auth/mfa/recovery-codes` — list all valid recovery codes as masked placeholders
  - `POST /auth/mfa/regenerate-codes` — invalidate all existing codes and generate 10 fresh ones
- Test suites for all 9 MFA API routes covering 200, 400, 401, 403, and 409 scenarios (`apps/api/src/routes/auth/mfa/__tests__/`)
- `POST /auth/refresh` route with test suite — issues a fresh 30-minute JWT to extend the session without re-authentication (`apps/api/src/routes/auth/refresh.route.ts`)
- `MfaSection` UI component orchestrating the full MFA lifecycle: status check, QR code setup via `otpauth://`, TOTP verification with OTP input, recovery code display/regeneration, disable, and email-based backup code delivery (`apps/web/src/features/settings/components/MfaSection.tsx`)
- Test suite for `MfaSection` covering idle, setup (QR code + OTP), enabled (recovery codes), and disable states (`apps/web/src/features/settings/components/__tests__/MfaSection.test.tsx`)
- MFA DTO types to `@repo/shared`: `LoginMFAResponse`, `MFAConfirmBody`, `MFARecoveryBody`, `MFASetupResponse`, `MFAEnableBody`, `MFAStatusResponse`, `MFARecoveryCodesResponse` (`packages/shared/src/dtos/auth.ts`)
- MFA notification email templates: MFA enabled (`mfaEnabled.html`), MFA disabled (`mfaDisabled.html`), backup code delivery (`mfaBackupCode.html`), and active MFA notice (`activeMFA.html`) under `apps/api/src/modules/user/email/`
- Redis client utility with lazy connection, 5-retry exponential backoff, and singleton pattern (`apps/api/src/utils/redis.ts`)
- `ioredis.d.ts` type declarations for the ioredis package (`apps/api/src/types/ioredis.d.ts`)
- Database migration removing `expiresAt` from `MFARecoveryCode` model (`20260605112717`)
- Database migration adding nullable `mfaSecret` field to `User` model (`20260605131700`)
- Redis service to `docker-compose.yml` with `redis:7-alpine` image, `redis-cli ping` healthcheck, persistent volume, and API dependency
- `ioredis`, `otplib`, `qrcode`, and `@types/qrcode` npm dependencies to API `package.json`
- `ResizeObserver` polyfill to web test setup for shadcn/ui component compatibility (`apps/web/src/test-setup.ts`)
- User REST API routes under `apps/api/src/routes/user/` with full OpenAPI schema documentation, JWT authentication, and rate limiting:
  - `GET /users/:userId` — retrieve a user by ID with `@me` alias for the authenticated user (rate-limited to 50 req/h)
  - `PUT /users` — update the authenticated user's name, email, or password (rate-limited to 10 req/5 min)
  - `DELETE /users` — permanently delete the authenticated user's account (rate-limited to 5 req/30 min)
- Test suites for all 3 user API routes covering 200/201/204/400/401/403/404/409/500 scenarios (`apps/api/src/routes/user/__tests__/`)
- Test suite for `PUT /projects/:id` covering 200/401/403/404/500 scenarios (`apps/api/src/routes/project/core/__tests__/update.test.ts`)
- `UpdateSecretModal` test suite covering open/close, pre-populated fields, form submission with changed values, empty-field-to-undefined coercion, and cancel behavior (`apps/web/src/features/projects/components/__tests__/UpdateSecretModal.test.tsx`)
- `NotificationsSection` UI component with local-state checkbox toggles for email, security alerts, and product updates (`apps/web/src/features/settings/components/NotificationsSection.tsx`)
- `UpdateUserInput` DTO type to `@repo/shared` for typed user profile update payloads (`packages/shared/src/dtos/user.ts`)
- Response schema documentation for `GET /projects/:projectId/secrets` route (was missing from original Swagger schema)

### Changed
<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
- Updated `todo.md` roadmap: "Search and filtering" corrected from [x] to [ ] (not yet implemented), "GitHub release" marked as [x] (completed)
- CI workflow: build `@repo/shared` package step added before monorepo typecheck to ensure shared types are compiled (`.github/workflows/ci.yaml`)
- MFA email templates normalized: indentation and inline CSS formatted consistently across all 4 templates (`apps/api/src/modules/user/email/`)
- EMAIL environment variable default set to `Secryn <name@domain>` in `.env.example`
- API `build` script extended to copy `src/modules/project/email/` templates into `dist/` (`apps/api/package.json`)
- `ProjectService.createInvite()` email template path changed from `path.join(__dirname, ...)` to `import.meta.dirname`; removed unused `node:path` import (`apps/api/src/modules/project/service.ts`)
- `EmailUtils.sendEmail()` enhanced with structured logging: logs email ID on success and error details on failure; returns email ID instead of raw Resend API response (`apps/api/src/utils/email.ts`)
- MFA login flow: `AuthService.login()` now returns `LoginMFAResponse` (with `mfaRequired` and short-lived `mfaToken`) when MFA is enabled, instead of setting the auth cookie immediately; callers must complete the OTP challenge via `POST /auth/mfa/confirm` or `POST /auth/mfa/recovery` (`apps/api/src/core/auth/service.ts`)
- Added `generateMFAToken()`, `verifyMFAToken()`, `confirmMFA()`, and `recoverMFA()` methods to `AuthService` for the full MFA challenge lifecycle (`apps/api/src/core/auth/service.ts`)
- Fixed `AuthService.decodeToken()` to correctly unwrap the nested `{ user: LoggedUser }` payload structure instead of casting the raw token as `LoggedUser`
- `UserService.Instance()` now accepts optional `userId` — returns a stub service for anonymous requests instead of requiring a logged-in user
- Added full MFA lifecycle methods to `UserService`: `setupMFA()` (TOTP secret + QR code), `enableMFA()` (verify TOTP, persist secret, generate 10 HMAC‑SHA256–hashed recovery codes), `disableMFA()`, `verifyTOTP()`, `consumeRecoveryCode()`, `getRecoveryCodes()`, `regenerateRecoveryCodes()`, `sendBackupCodeEmail()`, and `activeMFA()` (`apps/api/src/modules/user/service.ts`)
- Added `hashCode()` (HMAC‑SHA256) and `maskHash()` (constant placeholder) static helpers to `UserService` for recovery code security
- Added MFA recovery code repository methods: `createMFACode()`, `findMFACode()`, `consumeMFACode()`, `deleteMFACodes()`, `getValidRecoveryCodes()` (`apps/api/src/modules/user/repository.ts`)
- Added `isMFAEnabled` field to `SafeUser` Prisma select type; removed `expiresAt` field from `MFARecoveryCode` Prisma model and added `mfaSecret` to `User` model
- Updated `POST /auth/login` route handler to conditionally set the auth cookie (non-MFA path) or forward the MFA challenge response (`apps/api/src/routes/auth/login.route.ts`)
- Added `REDIS_URL` to `EnvUtils` validated environment variables (`apps/api/src/utils/env.ts`)
- Wired `MobileSidebar` and `Sidebar` logout buttons to `POST /auth/logout` API with loading state, post-logout navigation to login, and graceful local cleanup on API failure (`apps/web/src/features/dashboard/components/`)
- Added automatic token refresh on 401 responses in API client with deduplicated concurrent refresh attempts — a single `POST /auth/refresh` call is shared across parallel 401 failures, preventing race conditions (`apps/web/src/lib/api.ts`)
- `Content-Type: application/json` header is now only set when the request has a body (prevents Fastify from rejecting empty-body POST/PUT requests with a spurious content-type validation error) (`apps/web/src/lib/api.ts`)
- Added `MfaSection` import and render to `SettingsPage` composition (`apps/web/src/features/settings/SettingsPage.tsx`)
- Updated `LoginPage` with full MFA challenge UI: OTP input via `InputOTP` component, recovery code input with toggle, backup code email button, and error/success state management (`apps/web/src/features/auth/LoginPage.tsx`)
- API Dockerfile build step changed from raw `npx tsc` to `pnpm run build` (`apps/api/Dockerfile`)
- API `build` script extended to copy email template directory from `src/modules/user/email/` into `dist/` (`apps/api/package.json`)
- Added logout test cases to `MobileSidebar.test.tsx` and `Sidebar.test.tsx` with API mock coverage, loading-state assertions, and graceful-failure scenarios
- Added Content-Type header tests and token refresh retry tests to `api.test.ts` (`apps/web/src/lib/__tests__/api.test.ts`)
- Wired `ProfileSection` to `GET /users/@me` for fetching and `PUT /users` for saving name/email, with loading skeleton, error banner, and success message; replaced hardcoded `"John Doe"` / `"john@example.com"` defaults with live API data
- Wired `SecuritySection` to `PUT /users` for password changes with client-side validation (empty fields, password mismatch, minimum 8 characters), loading/error/success states, and field clearing on success
- Wired `DangerZoneSection` to `DELETE /users` for account deletion with `window.confirm` browser prompt, loading/error states, and post-deletion navigation to landing page
- Added OpenAPI schema documentation (summary, description, operationId, tags, params, body, response) to `GET /users/:userId`, `PUT /users`, and `DELETE /users` user routes
- Added `resolve.alias` for `@repo/shared` workspace package in API vitest config to fix module resolution during test execution
- Updated `DangerZoneSection`, `ProfileSection`, and `SecuritySection` test suites with API mock coverage, loading/success/error state assertions, controlled input handling, and form submission verification
- Added `NotificationsSection` import and render to `SettingsPage` composition
- Added comprehensive JSDoc documentation to 17 source files: `UserService` (Instance, isAuthorized, updateUser, getUserSafe), `UserRepository` (SafeUser type, find safe param), `AuthService` (Instance, cookieName), `ProjectService` constructor, all user route factory exports, vitest config alias, all settings section components, `UpdateUserInput` DTO, and all new test file `buildApp()` helpers

### Fixed
- `ownsProject` guard in `helper.ts` had inverted condition — was throwing `Forbidden` when the user IS the owner instead of when the user is NOT the owner, causing legitimate owner operations to fail with 403 (`apps/api/src/modules/project/helper.ts`)
- `ProjectService.createInvite()` now returns the created invite object (was missing return statement) (`apps/api/src/modules/project/service.ts`)
- Test mocks aligned with refactored routes: added missing `AuthService.Instance` mocks, renamed `updateNameProject` → `updateProject`, fixed secret mock data from object to `Secret[]` array, fixed invite/update/delete test assertions to match new route signatures, fixed `api.post` mock to return `{ ok: true }`, fixed `SettingsPage` to mock `MfaSection` instead of `NotificationsSection` (15 files across API and web)
- MFA test `Instance` mocks switched to async functions to prevent hoisted `vi.fn()` timeout failures
- Vitest `testTimeout` increased from 5s to 15s; CI test step changed from parallel to sequential to eliminate resource contention (`.github/workflows/ci.yaml`, `vitest.config.ts`)
- `ProjectService.updateSecret()` now returns the decrypted secret via `getSecret()` instead of the raw database record with the still-encrypted value (`apps/api/src/modules/project/service.ts`)
- Fixed secret test mock type casts from `as Secret` to `as unknown as Secret` across 4 test files to satisfy stricter TypeScript type checking (`apps/api/src/routes/project/secrets/__tests__/`)
- Created missing `NotificationsSection.tsx` component resolving test import failures across `NotificationsSection.test.tsx` and `SettingsPage.test.tsx`
- Fixed `@repo/shared` workspace package resolution error in API vitest that prevented all API test suites from running
- Fixed incorrect `@param` JSDoc documentation in `ProjectService` constructor (wrong parameter name) and `UserService.updateUser` (incorrect parameter type)

## 2026-06-04

### Added
- `CryptoUtils` utility class for AES-256-GCM encryption/decryption with hex-encoded `iv:tag:ciphertext` output (`apps/api/src/utils/crypto.ts`)
- Secret REST API routes under `apps/api/src/routes/project/secrets/` with full OpenAPI schema documentation, JWT authentication, and rate limiting (10 req / 5 min):
  - `POST /projects/:projectId/secrets` — create an encrypted secret
  - `DELETE /projects/secrets/:id` — permanently delete a secret
  - `GET /projects/secrets/:id` — retrieve and decrypt a single secret
  - `GET /projects/:projectId/secrets` — list and decrypt all secrets in a project
  - `PUT /projects/secrets/:id` — partial update of name, value, and/or notes
- Test suites for all 5 secret API routes covering 200/201/204/400/401/403/404/500 scenarios (`apps/api/src/routes/project/secrets/__tests__/`)
- `createSecret`, `deleteSecret`, `updateSecret`, `getSecret`, `getSecretOrThrow`, `getProjectSecrets` methods to `ProjectService` with AES-256-GCM encryption/decryption, permission validation (CREATE/DELETE/UPDATE/READ_SECRETS), and comprehensive JSDoc
- `findManySecrets` method to `ProjectRepository` for bulk secret retrieval by Prisma `WhereInput`
- `UpdateSecretModal` component with pre-populated fields from the selected secret, partial update support, and empty-string-to-undefined coercion (`apps/web/src/features/projects/components/UpdateSecretModal.tsx`)
- Edit button (Pencil icon) to `SecretRow` and `onEdit` callback wiring through `SecretsTable` → `SecretsPage`
- `notes` textarea field to `CreateSecretModal` form
- `UpdateSecretInput` DTO type to `@repo/shared` — all fields optional for partial updates (`packages/shared/src/dtos/secret.ts`)
- Test suites for `codeExamples`, `endpoints`, `mockApiKeys`, and `mockWebhooks` data modules (`apps/web/src/data/__tests__/`)
- `build` script and TypeScript devDependency to `packages/shared/package.json`
- `.dockerignore` patterns excluding `__tests__`, `.git`, `logs`, and `**/__tests__` from Docker context
- Centralized API client `lib/api.ts` with typed `get`/`post`/`put`/`patch`/`delete` helpers, structured `ApiError` class, auth token injection from `localStorage`, and `credentials: "include"` cookie-based auth
- Vite dev server proxy forwarding `/api/*` requests to backend with `changeOrigin` and env-var-driven target (`VITE_API_TARGET`)
- Frontend environment files: `.env.development` (`VITE_API_BASE_URL`, `VITE_API_TARGET`) and `.env.production` (`VITE_API_BASE_URL`)
- Backend environment template `apps/api/.env.example` documenting all required environment variables
- Nginx reverse proxy configuration `apps/web/nginx.conf` with SPA fallback, `/api/` proxy to backend, gzip compression, and forwarded headers
- Docker Compose healthchecks for `db` (`pg_isready`), `api` (`wget /api/v1/health`), and service dependency chains with `condition: service_healthy`
- `vite-env.d.ts` type declarations for custom Vite environment variables
- `apps/web/src/pages/__tests__/Landing.test.tsx` covering all 7 landing page sections
- `apps/web/src/lib/__tests__/api.test.ts` covering all HTTP methods, auth token injection, error handling, and query parameters
- `apps/web/src/routes/__tests__/paths.test.ts` with route constant validation and snapshot
- Inline comments documenting non-obvious patterns: httpOnly cookie auth flow, client-side password validation, dual-state visibility tracking, fixed-count skeleton placeholders, and fire-and-forget health check

### Changed
- `Secret` entity type expanded with `createdAt` (Date), `notes`, `projectId`, `addedById`, `updatedById` fields; `updatedAt` type changed from `string` to `Date`
- `CreateSecretInput` DTO now requires `notes` field
- `SecretsPage` fetch response type changed from `ProjectSecretsData` (object wrapper) to `Secret[]` (direct array)
- `SecretsPage` delete URL changed from `/secrets/:id` to `/projects/secrets/:id`
- `SecretsPage` now renders `UpdateSecretModal` with edit button wiring and local-state optimistic updates on success
- `CreateSecretModal` `onSubmit` now includes `notes` in the payload
- `SecretRow` and `SecretsTable` now accept and propagate `onEdit` callback
- `mockSecretsData` export removed from mock data barrel (`apps/web/src/data/index.ts`)
- JSDoc added to route factory exports in all 5 secret route files
- Wired `LoginPage` and `RegisterPage` to `POST /api/v1/auth/login` and `POST /api/v1/auth/register` with loading, error, and success states; added client-side password-match validation to registration
- Wired `ProjectsPage` to `GET /api/v1/projects` and `POST /api/v1/projects` with loading skeleton placeholders, error banner, and optimistic local-state updates
- Wired `SecretsPage` to `GET /projects/:projectId/secrets`, `POST /projects/:projectId/secrets`, and `DELETE /secrets/:id` with dual-state visibility tracking (local `Set` + clipboard hook)
- Wired `ApiKeysPage` to `GET /api-keys`, `POST /api-keys`, and `DELETE /api-keys/:id`
- Wired `WebhooksPage` to `GET /webhooks`, `POST /webhooks`, and `DELETE /webhooks/:id`
- Wired `ApiDocsPage` endpoint list to attempt `GET /docs/endpoints` with static fallback catalog matching real backend routes; added fire-and-forget health check on mount
- Rewrote `CreateProjectModal` with controlled inputs, `onSubmit` callback accepting `CreateProjectInput`, and synchronous form reset on close/submit
- Inlined `availableEvents` webhook event types into `CreateWebhookModal` (removed import from static data module)
- Added `PUT` to `ApiEndpoint.method` union type for rename-project endpoint display
- Moved API service from host-exposed port 3000 to internal-only Docker network; web service now on port 80 (was 5173)
- Dockerfiles refactored: builder stages use `node:22-alpine`, web runtime uses `nginx:alpine` with custom `nginx.conf`, API runtime copies built `dist` and `node_modules` from builder
- API Dockerfile: prisma generate during build, `EXPOSE 3000` and `ENV PORT=3000` declared
- Fixed PostgreSQL volume path in docker-compose from `/var/lib/postgresql` to `/var/lib/postgresql/data`
- Removed deprecated `version: "3.9"` from docker-compose.yml
- Updated 9 test files for API-wired pages with API client mocks, loading/error/populated state coverage, form submit assertions, and optimistic update verification
- Added JSDoc documentation to `ApiError` class, all `api` client helpers, `RequestOptions`, `resolveUrl`, `buildHeaders`, and `request` core function in `lib/api.ts`
- Added JSDoc annotations to `LoginPage`, `RegisterPage`, `ProjectsPage`, `SecretsPage`, `ApiKeysPage`, `WebhooksPage`, `ApiDocsPage`, `CreateProjectModal`, and `CreateWebhookModal`
- Expanded `ApiEndpoint` JSDoc with `@property` tags documenting non-obvious `color` field (Tailwind CSS class)

### Security
- Secret values are encrypted via AES-256-GCM before database storage and decrypted only after permission verification — raw secrets never reach the database in plain text

### Removed
- `apps/web/src/data/secrets.ts` — mock secrets data module removed after SecretsPage switched from mock data to live API

## 2026-06-03

### Added
- `README.md` with project overview, features, tech stack, configuration table, project structure, and available scripts
- `CONTRIBUTING.md` with branching strategy (feature/fix/chore/refactor/release), Conventional Commits (feat, fix, chore, docs, refactor, test, perf, ci), pull request process, and code style guide
- `ProjectService.Instance()` static async factory method replacing public constructor — loads full user record for authorization checks
- `UserService.getUserOrThrow()` method returning user entity or throwing `ResourceNotFound`
- `PolicyProject` authorization class with `hasPermission()` (ALL permission master override) and `isProjectOwner()` static methods (`modules/project/policy.ts`)
- Project utility helpers: `generateSlugFromName()`, `ownsProject()` guard, and `generateInvitationExpiryDate()` (`modules/project/helper.ts`)
- `projectInvitation.html` email template rendered from file system and sent via Resend (`modules/project/email/`)
- `addPermissionsToMember()` and `removePermissionsFromMember()` methods in `ProjectService` with MANAGE_MEMBERS permission validation and batch assignment
- `POST /projects/:projectId/members/:memberId/permissions` routes for adding and removing member permissions (`members/addPermissions.route.ts`, `members/removePermissions.route.ts`)
- `DELETE /projects/:projectId/members/:memberId` route replacing old `remove.ts` with `remove.route.ts` following `.route.ts` module convention
- Test suites for all three new member routes covering 204/400/401/403/404/500 scenarios (`members/__tests__/`)
- OpenAPI schema documentation (summary, description, params, body, response) for add-permissions, remove-permissions, and remove-member routes
- Route-level and JSDoc documentation for `PolicyProject`, `helper.ts`, `ProjectService.Instance`, and `alreadyExistsProject`
- Test suite for project invite create route covering 200/400/401/403/404/500 scenarios (`routes/project/invite/__tests__/create.test.ts`)
- Test suite for project invite accept route covering 204/400/401/404/500 scenarios (`routes/project/invite/__tests__/accept.test.ts`)
- Project member removal route `DELETE /projects/:projectId/members/:memberId` with ALL/REMOVE_MEMBERS permission check and self-removal guard (`routes/project/members/remove.ts`)
- VS Code workspace settings for TypeScript SDK path (`.vscode/settings.json`, `apps/web/.vscode/settings.json`)
- Secryn project roadmap with phased milestone tracking (`todo.md`)

### Changed
- Refactored `ProjectService` from constructor-based `new ProjectService(userId)` to async factory `ProjectService.Instance(userId)` with private constructor and pre-loaded `FullUser`
- All project and invite route handlers updated to use `await ProjectService.Instance(req.user.id)` factory pattern
- Switched authorization delegation from deleted `ProjectGuard` class to new `PolicyProject` static helpers
- Moved slug generation from deleted `utils.ts` to `helper.ts`; consolidated ownership check and invite expiry logic
- Updated `findProjectMemberPermissionAssignment` from `findFirst` to `findMany` returning all permission assignments per member
- Updated `deleteProjectMemberPermissionAssignment` parameter type from `WhereUniqueInput` to `WhereInput` with inline cast for composite unique key
- Added default message `"You don't have permission to perform this action"` to `AppError.Forbidden()` static factory
- Improved JSDoc across `ProjectService`: fixed class description, added `@async`/`@throws`/`@returns` tags, documented `removePermissionsFromMember` and `alreadyExistsProject`
- Added `@async` JSDoc tags to `UserService.createUser`, `deleteUser`, `getUser`, and `updateUser`
- Filled `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in `.env.example` with dummy values consistent with `DATABASE_URL`
- Added `APP_URL` environment variable to `.env.example` (required by `EnvUtils` at startup)
- Rewrote `addPermissionToMember` JSDoc block (removed incorrect `@deprecated`, added `@throws`, improved description and `@param` documentation)
- Extended `ProjectService` with `removeMemberToProject` method supporting permission validation (ALL/REMOVE_MEMBERS), member-not-found checks, and self-removal prevention
- Added `addPermissionToMember` stub method to `ProjectService` (pending implementation)
- Removed `.vscode` and `todo.md` from `.gitignore` to version-control workspace settings and roadmap

### Fixed
- `ProjectService.createInvite()` now loads and renders HTML email template from file system instead of inline string
- `assignAllPermissionToMemberUnsafe` uses `this.user` directly instead of guard-mediated user lookup
- Replaced `// TODO: implement` stub in `ProjectService.addPermissionToMember` with full implementation
- Remove-permissions route method corrected from `POST` to `DELETE` in `removePermissions.route.ts` and its test suite

### Removed
- `ProjectGuard` class (`modules/project/guard.ts`) — superseded by `PolicyProject` static authorization helpers
- `utils.ts` utility module (`modules/project/utils.ts`) — functions migrated to `helper.ts`
- `members/remove.ts` route file — replaced by `members/remove.route.ts` following `.route.ts` module convention
- `**/*todo.md` from ESLint ignore list

## 2026-06-02

### Added

- **Web application scaffold**: Complete React + Vite + TypeScript frontend under `apps/web/src/` with shadcn/ui design system
- 48 shadcn/ui reusable UI primitives under `components/ui/` (accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip)
- Landing page with Hero, Features, HowItWorks, Why, CTA sections, responsive Navbar, and Footer (`components/landing/`)
- Authentication pages: `LoginPage` and `RegisterPage` with shared `AuthLayout` (`features/auth/`)
- Dashboard layout: responsive layout with collapsible desktop sidebar, mobile sidebar drawer, top bar, and sidebar navigation (`layouts/DashboardLayout.tsx`, `features/dashboard/components/`)
- Projects feature: `ProjectsPage`, `SecretsPage`, `CreateProjectModal`, `ProjectCard`, `CreateSecretModal`, `SecretRow`, `SecretsTable` (`features/projects/`)
- API Keys feature: `ApiKeysPage`, `CreateApiKeyModal`, `ApiKeyRow` (`features/api-keys/`)
- API Docs feature: `ApiDocsPage` for documentation display (`features/api-docs/`)
- Webhooks feature: `WebhooksPage`, `CreateWebhookModal`, `WebhookCard` (`features/webhooks/`)
- Settings feature: `SettingsPage` with `ProfileSection`, `SecuritySection`, `NotificationsSection`, `DangerZoneSection` (`features/settings/`)
- Shared components: `EmptyState` (empty table placeholder), `Modal` (dialog wrapper), `PageHeader` (title with action button), `SecretValue` (clipboard copy + visibility toggle) (`components/common/`)
- Custom hooks: `useClipboard` (copy-to-clipboard with timed feedback), `useMobile` (viewport breakpoint detection), `useToggleVisibility` (boolean toggle) (`hooks/`)
- TypeScript types for projects, secrets, API keys, API docs, webhooks, and common utilities (`types/`)
- Mock data for all entities used in UI development and testing (`data/`)
- Centralized React Router v7 configuration with path constants (`routes.ts`, `routes/paths.ts`)
- Tailwind CSS v4 design system with CSS custom properties, dark mode support (`next-themes`), and `tw-animate-css` animation utilities (`styles/`)
- framer-motion test mock for jsdom compatibility (`__mocks__/framer-motion.tsx`)
- 30+ frontend npm dependencies: Radix UI primitives (22 packages), Tailwind CSS v4, React Router v7, framer-motion, recharts, react-hook-form, lucide-react, sonner, vaul, cmdk, embla-carousel-react, input-otp, react-day-picker, class-variance-authority, clsx, tailwind-merge, tw-animate-css, next-themes
- Comprehensive Vitest + Testing Library test suite (44 test files) covering all components, pages, hooks, and layouts
- Test infrastructure: jsdom environment, `@` path alias, framer-motion mock alias, IntersectionObserver polyfill in `test-setup.ts`, `tsconfig.test.json`
- Comprehensive JSDoc documentation across all source files, components, hooks, types, and data modules
- Project module with `ProjectService`, `ProjectGuard`, `ProjectRepository`, and slug utility (`modules/project/`)
- Project REST API routes: create (`POST /projects`), get (`GET /projects/:id`), update name (`PUT /projects/:id`), delete (`DELETE /projects/:id`), and transfer ownership (`POST /projects/:id/transfer`) under `routes/project/`
- Comprehensive test suite for all project routes with mocked dependencies (`routes/project/__tests__/`)
- `EmailUtils` class for transactional email delivery via Resend (`utils/email.ts`)
- `EMAIL` and `RESEND_API_KEY` environment variables with `.env.example` entries
- `resend` npm dependency to `package.json`
- `@fastify/jwt` module augmentation for typed JWT payloads (`types/fastify.d.ts`)
- Database migration to rename Team tables to Project tables (`20260601212532`)
- Database migration recreating tables without `uuid` columns (`20260602100000`)
- Comprehensive `///` documentation comments across Prisma schema, models, and enums
- `ProjectMemberPermission` enum with `ALL` wildcard permission (`enums/team.prisma`)
- `createInvite` and `acceptInvite` methods to `ProjectService` with permission validation, 7-day expiry, and HTML email notification via Resend
- Project invite REST API routes: `POST /projects/:id/invites` and `GET /projects/invites/:slug` under `routes/project/invite/`
- Swagger/OpenAPI schema documentation for invite create and accept routes
- `JSDoc` documentation for `vi.hoisted()` Vitest pattern across all project test suites
- Route prefix `/api/v1` to Fastify route registration

### Changed

- Replaced placeholder "Hello, World!" React app with full `RouterProvider`-based application (`App.tsx` now renders React Router provider)
- Migrated CSS entry point from `src/index.css` to `src/styles/index.css`
- Added Tailwind CSS v4 Vite plugin to build configuration (`vite.config.ts`)
- Updated vitest config with jsdom environment, `@` path alias, and framer-motion mock resolution
- Added test file exclusions to `tsconfig.app.json`
- Added `tsconfig.test.json` project reference to `tsconfig.json`
- Added `test-setup.ts` to ESLint ignore patterns
- Added JSDoc documentation to `App.tsx`, `main.tsx`, and `test-setup.ts`
- Renamed Prisma models: `Team` → `Project`, `TeamMember` → `ProjectMember`, `TeamInvite` → `ProjectInvite`, `TeamMemberPermissionAssignment` → `ProjectMemberPermissionAssignment`
- Renamed `TeamMemberPermission` enum to `ProjectMemberPermission`; removed `TeamMemberRole` enum
- Switched user JWT payload identifier from `uuid` to `id` in `AuthService` and `LoggedUser` type
- Updated `FullUser` repository type include set from `teams` to `projects`
- Updated `UserRole` enum documentation to clarify ADMIN bypasses project-level checks
- Changed `envVariables()` return type to `as const` for stricter type inference
- Added `EMAIL` and `RESEND_API_KEY` to `EnvUtils` validated env accessors
- Moved route registration to use `/api/v1` prefix in `main.ts`
- Updated `SecretValue` mock in `SecretsTable.test.tsx` to include `onToggle` prop and Show/Hide button
- Replaced `userEvent.type()` with `fireEvent.change()` in `LoginPage.test.tsx`, `RegisterPage.test.tsx`, and `CreateSecretModal.test.tsx`
- Replaced direct `.click()` with `fireEvent.click()` in `ApiKeysPage.test.tsx`, `ProjectsPage.test.tsx`, `SecretsPage.test.tsx`, and `CreateProjectModal.test.tsx`
- Replaced `MemoryRouter` with `createMemoryRouter`/`RouterProvider` in `DashboardLayout.test.tsx`
- Removed `MobileSidebar` mock in `DashboardLayout.test.tsx`, now testing real component with `within()` queries
- Reorganized project route files from flat `routes/project/` into `routes/project/core/` subdirectory for co-location with tests and invite routes
- Moved `ProjectMemberPermission` enum from `enums/team.prisma` to `enums/project.prisma`

### Removed

- `apps/web/src/index.css` (replaced by modular CSS under `styles/`)
- Boilerplate URL comment from `vite.config.ts`
- `Team`, `TeamMember`, `TeamInvite`, `TeamMemberPermissionAssignment` Prisma models
- `TeamMemberRole` enum
- `uuid` field from `User` model (simplified to single `cuid()` identifier)
- `apps/api/prisma/models/team.prisma` file
- `@@unique([addedBy, permission])` unique constraint from `ProjectMemberPermissionAssignment` model
- `@@index([projectMemberId, addedBy])` compound index from `ProjectMemberPermissionAssignment` model
- `enums/team.prisma` file (replaced by `enums/project.prisma`)

### Fixed

- Added DOM cleanup (`cleanup()`) to test setup `afterEach` to prevent cross-test DOM pollution (`test-setup.ts`)
- Fixed `AuthLayout` import from default to named export in `AuthLayout.test.tsx`
- Fixed `ApiDocsPage.test.tsx` assertion for duplicate text `/v1/projects` (`getByText` → `getAllByText`)
- Fixed permission text case from "Read"/"Write" to "read"/"write" in `CreateApiKeyModal.test.tsx`
- Added `waitFor` async assertions in `WebhooksPage.test.tsx` for modal show/hide operations
- Fixed `RegisterPage.test.tsx` form submission to check terms checkbox and use `fireEvent.submit(form)`
- Set non-empty project ID in `SecretsPage.test.tsx` missing-project test case
- Added inline framer-motion mock to `ApiKeysPage.test.tsx`

## 2026-06-01

### Added

- Auth module test suite with login, register and logout test cases
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
- `AppError` class with static factory methods for standardized HTTP error responses (`core/errors/appError.ts`)
- Global Fastify error handler (`registerErrorHandler`) covering `AppError`, validation errors, and unexpected server errors (`core/errors/errorHandler.ts`)
- Error code constants (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, etc.) for machine-readable error categorization
- Auth module with `POST /auth/register`, `POST /auth/login`, and `POST /auth/logout` endpoints
- `AuthService` class for JWT generation, verification, and refresh
- `UserService` with bcrypt password hashing and user CRUD operations
- `UserRepository` as Prisma data-access layer for user queries
- `@fastify/cookie` and `bcrypt` dependencies
- `LoggedUser` type and Fastify request type augmentation for authenticated requests
- JWT authentication guard (`authenticate` preHandler) via root-level Fastify decorator
- `decodeToken()` method to `AuthService` for cookie-based JWT decoding without signature verification
- `authPlugin` Fastify plugin encapsulating the authenticate decorator
- `preHandler` type to `AppRouteObject` for route-level middleware support
- `authenticate` hook type to `FastifyInstance` type augmentation
- Auth guard to `POST /auth/logout` route requiring valid JWT cookie
- Logout test cases for unauthenticated (401) and internal error (500) scenarios

### Changed

- Refactored health check tests to use self-contained Fastify instance instead of global singleton
- Added test environment variables (DATABASE_URL, JWT_SECRET, etc.) to vitest config
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
- Broadened logger `meta` type from `Record<string, unknown>` to `unknown` for wider compatibility
- Added comprehensive JSDoc documentation to logger module
- Removed unused error codes (`RESOURCE_CREATED`, `RESOURCE_DELETED`, `RESOURCE_UPDATED`) and factory methods from `AppError`
- Added default message and missing `@param` JSDoc tags to `AppError` factory methods
- Updated Fastify singleton to use env-based logger and relaxed AJV validation
- Reordered plugin registrations in `main.ts` (cookie, JWT, rate-limit, CORS registered before Swagger)
- Switched route loading from direct function call to Fastify plugin registration with explicit `ready()` await
- Rewrote route loader to discover route files dynamically via fast-glob from `routes/` directory
- Added trailing comma in ESLint ignore list
- Added `prisma generate` step to CI pipeline

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
