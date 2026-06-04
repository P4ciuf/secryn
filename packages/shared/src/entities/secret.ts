/**
 * A single secret record stored within a project.
 *
 * @property id - Unique secret identifier
 * @property createdAt - ISO-8601 timestamp of creation
 * @property updatedAt - ISO-8601 timestamp of the last modification (name, value, or notes)
 * @property name - Key name (typically SCREAMING_SNAKE_CASE, e.g. {@code DATABASE_URL})
 * @property notes - Optional human-readable annotation about the secret
 * @property value - The secret's plain-text value (masked in the UI by default; encrypted at rest in the API)
 * @property projectId - ID of the project this secret belongs to
 * @property addedById - ID of the project member who created the secret
 * @property updatedById - ID of the project member who last modified the secret
 */
export interface Secret {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  notes: string;
  value: string;
  projectId: string;
  addedById: string;
  updatedById: string;
}
