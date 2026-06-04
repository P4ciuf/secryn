/**
 * A workspace that groups secrets and members together.
 *
 * @property id - Unique project identifier
 * @property name - Display name
 * @property slug - URL-friendly unique identifier derived from the name
 * @property description - Optional longer description of the project's purpose
 * @property ownerId - ID of the user who owns the project
 * @property secrets - Lightweight array of secret references (id only), used by the project card
 * @property color - Tailwind CSS background utility class for the project's accent color
 * @property createdAt - ISO-8601 creation timestamp
 * @property updatedAt - ISO-8601 last-modification timestamp
 */
export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  secrets?: Array<{ id: string }>;
  color?: string;
  createdAt: string;
  updatedAt: string;
}
