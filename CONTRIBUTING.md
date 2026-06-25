# Contributing to Secryn

Thank you for considering a contribution. Secryn is a pnpm monorepo with a Next.js App Router
full-stack application. This document covers everything you need to start contributing.

## Code of Conduct

Be respectful, constructive, and collaborative. Treat every contributor with professionalism.
Harassment, derogatory comments, and personal attacks are not tolerated. If you experience or
witness unacceptable behavior, open a private discussion with the maintainers.

## Getting Started for Contributors

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Add the upstream remote:

   ```bash
   git remote add upstream https://github.com/P4ciuf/secryn.git
   ```

4. Keep your fork in sync with upstream before starting new work:

   ```bash
   git checkout main
   git pull upstream main
   ```

## Development Setup

```bash
# Enable Corepack and install dependencies
corepack enable
pnpm install

# Copy and configure environment
cp app/.env.example app/.env
# Edit app/.env with valid values (all variables must be set — see README Configuration)

# Start PostgreSQL and Redis
docker compose up -d db redis

# Generate Prisma client and push schema
pnpm db:generate
pnpm db:push

# Start development server
pnpm dev       # http://localhost:3000
```

## Branching Strategy

Create branches from an up-to-date `main`. Use the following prefixes:

| Prefix      | Purpose                                    | Example                      |
| ----------- | ------------------------------------------ | ---------------------------- |
| `feature/`  | New functionality                          | `feature/project-encryption` |
| `fix/`      | Bug fixes                                  | `fix/jwt-expiry-check`       |
| `chore/`    | Maintenance, dependencies, tooling         | `chore/update-prisma-v8`     |
| `refactor/` | Code restructuring without behavior change | `refactor/user-service`      |
| `release/`  | Release preparation branches               | `release/v0.1.0`             |

Name branches with a short, hyphenated description. Example: `feature/add-project-transfer`.

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Each commit
message must follow this format:

```text
<type>(<scope>): <description>
```

### Types

| Type       | Usage                                            |
| ---------- | ------------------------------------------------ |
| `feat`     | A new feature                                    |
| `fix`      | A bug fix                                        |
| `chore`    | Maintenance, dependencies, build tooling changes |
| `docs`     | Documentation changes only                       |
| `refactor` | Code restructuring; no feature or fix            |
| `test`     | Adding or updating tests                         |
| `perf`     | Performance improvement                          |
| `ci`       | CI/CD configuration changes                      |

### Scopes

Use the package name when the change is package-specific: `app`, `cli`, `sdk-py`, `sdk-ts`.
Use a more specific scope when appropriate: `prisma`, `auth`, `project`, `docker`, `infra`.

### Examples

```text
feat(auth): add NextAuth credentials provider
fix(ui): correct sidebar collapse on mobile
chore(deps): bump prisma to 7.8.0
docs: add API endpoint table to README
test(api): cover project invite accept route
refactor(auth): migrate to NextAuth v5 session management
```

### Rules

- Use lowercase for the description (after the colon).
- Keep the first line under 72 characters.
- Use the imperative mood ("add", not "added" or "adds").
- Break changes: add `!` after the type/scope and include `BREAKING CHANGE:` in the footer.

## Pull Request Process

1. Before opening a PR, ensure your branch is up to date with `main`:

   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. Run the full CI checks locally and make sure they pass:

   ```bash
   pnpm lint
   pnpm format:check
   pnpm typecheck
   pnpm test
   ```

3. Open a pull request against the `main` branch with a descriptive title following the
   commit convention (e.g., `feat(api): add project invite email notifications`).

4. Fill in the PR description: explain what the change does, why it is needed, and any
   breaking or behavioral changes.

5. All PRs require passing CI (lint, format check, typecheck, tests). A maintainer will
   review your PR. Address any feedback and request a re-review once updated.

6. Once approved, a maintainer will squash-merge your PR. The merge commit title becomes
   the final commit message — write your PR title accordingly.

## Running Tests

Tests use Vitest. Test files are co-located with their source modules under `__test__/`.

```bash
# Run all test suites
pnpm test

# Run tests in watch mode (useful during development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

Test environment variables are configured in each package's `vitest.config.ts` and use
dummy values — no real credentials are needed. Route handler tests mock Prisma, Redis,
and NextAuth dependencies; page tests mock `apiFetch` and Server Actions.

## Code Style

This project enforces formatting and linting automatically:

- **Prettier** — Format on pre-commit via Husky + lint-staged. Config: double quotes,
  semicolons, trailing commas, 100-char width.
- **ESLint** — Flat config covering TypeScript, JSON, Markdown, and CSS. Enforces
  `@typescript-eslint/no-unused-vars` (prefix unused args with `_`).
- **TypeScript** — Strict mode enabled.

Check before committing:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

The pre-commit hook runs `lint-staged`, which auto-fixes ESLint and Prettier issues on
staged files. If the hook fails, review the output, fix the issues, and stage the changes
again.

## Core Architecture

- **Auth**: NextAuth.js v5 with credentials provider (`app/src/auth.ts`). Session managed
  via JWT callbacks that enrich the token with user fields. Route handlers resolve the
  caller via `getSessionOrThrow(await auth())`.
- **Middleware**: Next.js Edge Middleware (`app/src/proxy.ts`) checks NextAuth session
  and redirects/protects routes accordingly.
- **Server Actions**: Login/register/logout use Server Actions wrapping NextAuth's
  `signIn`/`signOut` with a `serverActionHandler` HOF for typed error responses.
- **API client**: `apiFetch<T>()` in `app/src/lib/api.ts` — includes automatic 401
  refresh, deduplicated concurrent refreshes, and `credentials: "include"`.

## Reporting Bugs

Open an issue on GitHub and include:

- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs. actual behavior.
- Environment details: Node version, pnpm version, OS, Docker version (if applicable).
- Relevant logs, screenshots, or error messages.

Before reporting, search existing issues to avoid duplicates.

## Suggesting Features

Open an issue with the title prefixed by `Feature request:`. Describe:

- The problem the feature solves.
- A concrete proposal for how it should work.
- Any alternatives you considered.
- Whether you are willing to implement it yourself.

Feature requests that align with the project roadmap (see `docs/todo.md`) are prioritized.

## Questions

For questions not covered here, open a GitHub Discussion (if enabled) or a regular issue
with the `question` label. Keep questions constructive and specific.
