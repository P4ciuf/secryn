/**
 * A single secret record stored within a project.
 *
 * @property id - Unique secret identifier
 * @property name - Key name (typically SCREAMING_SNAKE_CASE, e.g. {@code DATABASE_URL})
 * @property value - The secret's plain-text value (masked in the UI by default)
 * @property updatedAt - ISO-8601 timestamp of the last modification
 */
export interface Secret {
  id: string;
  name: string;
  value: string;
  updatedAt: string;
}
