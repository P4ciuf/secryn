# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
## [Unreleased]

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

### Changed
- CI workflow: build `@repo/shared` package step added before monorepo typecheck to ensure shared types are compiled (`.github/workflows/ci.yaml`)
- MFA email templates normalized: indentation and inline CSS formatted consistently across all 4 templates (`apps/api/src/modules/user/email/`)
- EMAIL environment variable default set to `SecureVault <name@domain>` in `.env.example`
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

### Fixed
- `ProjectService.createInvite()` now returns the created invite object (was missing return statement) (`apps/api/src/modules/project/service.ts`)
- Test mocks aligned with refactored routes: added missing `AuthService.Instance` mocks, renamed `updateNameProject` → `updateProject`, fixed secret mock data from object to `Secret[]` array, fixed invite/update/delete test assertions to match new route signatures, fixed `api.post` mock to return `{ ok: true }`, fixed `SettingsPage` to mock `MfaSection` instead of `NotificationsSection` (15 files across API and web)
- MFA test `Instance` mocks switched to async functions to prevent hoisted `vi.fn()` timeout failures
- Vitest `testTimeout` increased from 5s to 15s; CI test step changed from parallel to sequential to eliminate resource contention (`.github/workflows/ci.yaml`, `vitest.config.ts`)
- `ProjectService.updateSecret()` now returns the decrypted secret via `getSecret()` instead of the raw database record with the still-encrypted value (`apps/api/src/modules/project/service.ts`)
- Fixed secret test mock type casts from `as Secret` to `as unknown as Secret` across 4 test files to satisfy stricter TypeScript type checking (`apps/api/src/routes/project/secrets/__tests__/`)

## 2026-06-05

### Added
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
- Wired `ProfileSection` to `GET /users/@me` for fetching and `PUT /users` for saving name/email, with loading skeleton, error banner, and success message; replaced hardcoded `"John Doe"` / `"john@example.com"` defaults with live API data
- Wired `SecuritySection` to `PUT /users` for password changes with client-side validation (empty fields, password mismatch, minimum 8 characters), loading/error/success states, and field clearing on success
- Wired `DangerZoneSection` to `DELETE /users` for account deletion with `window.confirm` browser prompt, loading/error states, and post-deletion navigation to landing page
- Added OpenAPI schema documentation (summary, description, operationId, tags, params, body, response) to `GET /users/:userId`, `PUT /users`, and `DELETE /users` user routes
- Added `resolve.alias` for `@repo/shared` workspace package in API vitest config to fix module resolution during test execution
- Updated `DangerZoneSection`, `ProfileSection`, and `SecuritySection` test suites with API mock coverage, loading/success/error state assertions, controlled input handling, and form submission verification
- Added `NotificationsSection` import and render to `SettingsPage` composition
- Added comprehensive JSDoc documentation to 17 source files: `UserService` (Instance, isAuthorized, updateUser, getUserSafe), `UserRepository` (SafeUser type, find safe param), `AuthService` (Instance, cookieName), `ProjectService` constructor, all user route factory exports, vitest config alias, all settings section components, `UpdateUserInput` DTO, and all new test file `buildApp()` helpers

### Fixed
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

### Security
- Secret values are encrypted via AES-256-GCM before database storage and decrypted only after permission verification — raw secrets never reach the database in plain text

### Removed
- `apps/web/src/data/secrets.ts` — mock secrets data module removed after SecretsPage switched from mock data to live API

## 03/06/2026

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
- SecureVault project roadmap with phased milestone tracking (`todo.md`)
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
