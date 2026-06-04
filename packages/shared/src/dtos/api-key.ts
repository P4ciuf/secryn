import type { ApiKeyPermission } from "../entities/api-key.js";

/**
 * Request body for {@code POST /api-keys}.
 *
 * @property name - Human-readable label for the key
 * @property permissions - Set of {@link ApiKeyPermission} values to grant
 */
export interface CreateApiKeyInput {
  name: string;
  permissions: ApiKeyPermission[];
}
