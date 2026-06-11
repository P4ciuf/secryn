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

/**
 * Request body for {@code PUT /api-keys/:id}.
 *
 * All fields are optional — only provided properties are updated.
 * Permissions are modified via explicit add and remove lists rather
 * than a full replacement, so the caller only sends the diffs.
 *
 * @property name - New human-readable label for the key
 * @property isActive - Toggle the active status
 * @property addPermissions - Permissions to grant
 * @property removePermissions - Permissions to revoke
 */
export interface UpdateApiKeyInput {
  name?: string;
  isActive?: boolean;
  addPermissions?: ApiKeyPermission[];
  removePermissions?: ApiKeyPermission[];
}
