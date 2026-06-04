# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
## [Unreleased]

### Added
- `@repo/shared` TypeScript package with shared types, DTOs, error codes, and utility types (`packages/shared/`)
- Prisma migration adding `description` field to `Project` model (`20260604150713_add_description_to_projects`)
- `getUserProjects()` method to `ProjectService` returning all projects owned by or shared with the user
- `getProjectOrThrow()` method to `ProjectService` replacing inline existence checks with typed error
- `GET /projects/@all` support in project route — invokes `getUserProjects` when `:id` is the literal `@all`
- Test case for `GET /projects/@all` confirming array response and `getUserProjects` mock invocation
- `ErrorBoundary` route error component handling RouteErrorResponse, Error, string, and unknown error types with Go Back and Retry buttons (`components/ErrorBoundary.tsx`)
- `ErrorBoundary` test suite covering all 4 error-type branches and button interactions (`components/__tests__/ErrorBoundary.test.tsx`)
- Router structure test suite verifying 12 route paths, all ErrorBoundary attachments, and NotFound catch-all (`__tests__/routes.test.ts`)
- Mock project data shape validation test suite (`data/__tests__/projects.test.ts`)
- `MockProjectService.Instance` static factory pattern to all project core, invite, and member test files — prevents 500 errors from undefined `Service.Instance()`
- `registerErrorHandler` registration to all project core and invite test files for proper error response handling
- `logger.error` mock to project get test to support error handler log calls
- Swagger `response` schema on `GET /projects/:id` using `oneOf` for single-project and array (`@all`) response shapes
- Typed request-parameter and body interfaces across all project, invite, and member route handlers
- Comprehensive JSDoc documentation for all 15 `packages/shared/` files — entities, DTOs, enums, errors, pagination, and utility types
- JSDoc documentation for `pickColor()` hash function (`ProjectCard`) explaining the DJB2 deterministic color algorithm
- JSDoc documentation for 7 previously undocumented `ProjectService` methods (`getProjectOrThrow`, `getUserProjects`, `getMember`, `getMemberOrThrow`, `getInviteOrThrow`, `getPermissionAssignment`, `getPermissionAssignmentOrThrow`)
- JSDoc documentation for `ErrorBoundary` component describing the four error-type handling priorities
- `update.route.ts` route handler superseding `updateName.route.ts` — supports partial updates of `name` and `description` via `updateProject({ name?, description? })`

### Changed
- Migrated frontend type definitions from `apps/web/src/types/` to shared `packages/shared/` package — all components and data modules now import from `@repo/shared`
- `createProject` signature changed from `createProject(name)` to `createProject(name, desc)` — description parameter propagated to Prisma, service, route schema, and handler
- `CreateProjectModal`, `CreateSecretModal`, `CreateWebhookModal`, and `CreateApiKeyModal` `onSubmit` callback changed from multi-argument to single-object `onSubmit(input)` matching DTO types
- Auth route imports in `login.route.ts` and `register.route.ts` switched from local inline type definitions to `@repo/shared` (`LoginBody`, `RegisterBody`)
- Updated 6 frontend test files with type import fixes (`@/types` → `@repo/shared`)
- Updated 3 frontend test files with modal signature assertion fixes (two-argument → single-object)
- Updated `RegisterPage` test assertion from `name` to `username` matching `RegisterBody` DTO shape
- Updated `ProjectsPage` test `api.get` mock responses from `{ projects: [...] }` wrapper to direct array
- `updateNameProject(name)` refactored to `updateProject({ name?, description? })` — slug regeneration only triggers when the name changes; omitted fields retain current values
- `removeMemberToProject` JSDoc corrected: permission check applies to the member being removed (not the caller)
- `getPermissionAssignment` and `getPermissionAssignmentOrThrow` JSDoc corrected: return a single record (not an array)
- `updateName.test.ts` import updated from `updateName.route.js` to `update.route.js`

### Fixed
- All project core, invite, and member test suites now use `MockProjectService.Instance` static factory — fixes 500 error from undefined `ProjectService.Instance()`
- All project core and invite tests now register the global error handler — fixes 500 error from unhandled error propagation
- `removePermissions` route test descriptions corrected from `POST` to `DELETE` matching the route's HTTP method
- Invite create route response schema now returns the full invite object (id, slug, projectId, expiresAt, createdAt) instead of `{ ok: boolean }`

### Removed
- `apps/web/src/types/api-keys.ts` — type definitions migrated to `@repo/shared`
- `apps/web/src/types/projects.ts` — type definitions migrated to `@repo/shared`
- `apps/web/src/types/secrets.ts` — type definitions migrated to `@repo/shared`
- `apps/web/src/types/webhooks.ts` — type definitions migrated to `@repo/shared`
- Dead `vi.mock("@/data/webhooks")` block from `CreateWebhookModal` test (source no longer imports from this module)
- `updateName.route.ts` (apps/api/src/routes/project/core/updateName.route.ts) — replaced by `update.route.ts` with partial-update support

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
