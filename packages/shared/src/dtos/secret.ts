import type { Secret } from "../entities/secret.js";

/**
 * Request body for {@code POST /projects/:projectId/secrets}.
 * All fields are required by the endpoint schema.
 */
export interface CreateSecretInput {
  name: string;
  value: string;
  notes: string;
}

/**
 * Request body for {@code PUT /projects/secrets/:id}.
 * All fields are optional — only the fields provided are updated.
 */
export interface UpdateSecretInput {
  name?: string;
  value?: string;
  notes?: string;
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
