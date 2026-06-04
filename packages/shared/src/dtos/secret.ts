import type { Secret } from "../entities/secret.js";

/**
 * Request body for {@code POST /projects/:projectId/secrets}.
 *
 * @property name - Secret key name (convention: SCREAMING_SNAKE_CASE)
 * @property value - The plain-text secret value to store
 */
export interface CreateSecretInput {
  name: string;
  value: string;
}

/**
 * Response shape for {@code GET /projects/:projectId/secrets}.
 *
 * @property name - The project's display name
 * @property secrets - Array of secrets belonging to the project
 */
export interface ProjectSecretsData {
  name: string;
  secrets: Secret[];
}
