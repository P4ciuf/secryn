/**
 * Barrel export for the {@code @repo/shared} package.
 *
 * Re-exports all shared types, DTOs, enums, and utility types consumed by
 * both the API server ({@code apps/api}) and the web client ({@code apps/web}).
 * Every public type in the package should have a corresponding export in this file.
 */

// Entities — domain model types
export type { LoggedUser } from "./src/entities/user.js";
export type { Project } from "./src/entities/project.js";
export type { Secret } from "./src/entities/secret.js";
export type { ApiKey, ApiKeyPermission } from "./src/entities/api-key.js";
export type { Webhook, WebhookEvent } from "./src/entities/webhook.js";

// DTOs — request/response shapes for API endpoints
export type { LoginBody, RegisterBody } from "./src/dtos/auth.js";
export type { CreateProjectInput } from "./src/dtos/project.js";
export type {
  CreateSecretInput,
  UpdateSecretInput,
  ProjectSecretsData,
} from "./src/dtos/secret.js";
export type { CreateApiKeyInput } from "./src/dtos/api-key.js";
export type { CreateWebhookInput } from "./src/dtos/webhook.js";

// Enums & errors
export { errorCode, type ErrorCodeValue } from "./src/enums/error-code.js";

export type { ErrorResponse } from "./src/errors/index.js";

// Pagination & utilities
export type { PaginatedResponse } from "./src/pagination/index.js";

export type { Nullable, DeepPartial } from "./src/utils/index.js";
