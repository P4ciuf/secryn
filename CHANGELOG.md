# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),

<!-- eslint-disable-next-line markdown/no-missing-label-refs -->
## [Unreleased]

### Added
- `README.md` with project overview, features, tech stack, configuration table, project structure, and available scripts
- `CONTRIBUTING.md` with branching strategy (feature/fix/chore/refactor/release), Conventional Commits (feat, fix, chore, docs, refactor, test, perf, ci), pull request process, and code style guide

### Changed
- Filled `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in `.env.example` with dummy values consistent with `DATABASE_URL`
- Added `APP_URL` environment variable to `.env.example` (required by `EnvUtils` at startup)
- Improved `ProjectService` JSDoc — added `@async` tags to `createProject`, `deleteProject`, `updateNameProject`, `transferOwnerProject`, `getProject`, and `acceptInvite`
- Rewrote `addPermissionToMember` JSDoc block (removed incorrect `@deprecated`, added `@throws`, improved description and `@param` documentation)

### Fixed
- Replaced `// TODO: implement` stub in `ProjectService.addPermissionToMember` with explicit `throw new Error(...)` so the unimplemented method fails loudly if called

## 2026-06-03

### Added
- Test suite for project invite create route covering 200/400/401/403/404/500 scenarios (`routes/project/invite/__tests__/create.test.ts`)
- Test suite for project invite accept route covering 204/400/401/404/500 scenarios (`routes/project/invite/__tests__/accept.test.ts`)
- Project member removal route `DELETE /projects/:projectId/members/:memberId` with ALL/REMOVE_MEMBERS permission check and self-removal guard (`routes/project/members/remove.ts`)
- VS Code workspace settings for TypeScript SDK path (`.vscode/settings.json`, `apps/web/.vscode/settings.json`)
- SecureVault project roadmap with phased milestone tracking (`todo.md`)

### Changed
- Extended `ProjectService` with `removeMemberToProject` method supporting permission validation (ALL/REMOVE_MEMBERS), member-not-found checks, and self-removal prevention
- Added `addPermissionToMember` stub method to `ProjectService` (pending implementation)
- Removed `.vscode` and `todo.md` from `.gitignore` to version-control workspace settings and roadmap

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
