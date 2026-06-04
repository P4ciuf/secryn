/**
 * Request body for {@code POST /projects}.
 *
 * @property name - Display name of the new project (must be unique per user)
 * @property description - Optional longer description
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
}
