/** Granular permission level for an API key. */
export type ApiKeyPermission = "read" | "write";

/**
 * An API key used for programmatic access to the vault.
 *
 * @property id - Unique key identifier
 * @property keyName - Human-readable label (e.g. "Production API Key")
 * @property key - The full secret key value (prefixed with {@code sv_})
 * @property userId - The owner user ID
 * @property isActive - Whether the key is currently active
 * @property createdAt - ISO-8601 creation timestamp
 * @property updatedAt - ISO-8601 last-update timestamp
 * @property expiresAt - ISO-8601 expiration timestamp
 * @property permissions - Set of {@link ApiKeyPermission} values granted to this key
 */
export interface ApiKey {
  id: string;
  keyName: string;
  key: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  permissions: ApiKeyPermission[];
}
