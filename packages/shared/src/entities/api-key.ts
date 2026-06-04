/** Granular permission level for an API key. */
export type ApiKeyPermission = "read" | "write";

/**
 * An API key used for programmatic access to the vault.
 *
 * @property id - Unique key identifier
 * @property name - Human-readable label (e.g. "Production API Key")
 * @property key - The full secret key value (prefixed with {@code sv_})
 * @property createdAt - ISO-8601 creation timestamp
 * @property lastUsed - ISO-8601 timestamp of the last usage, or a human-readable string like "Never"
 * @property permissions - Set of {@link ApiKeyPermission} values granted to this key
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  permissions: ApiKeyPermission[];
}
