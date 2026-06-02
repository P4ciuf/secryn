/** Granular permission level for an API key. */
export type ApiKeyPermission = "read" | "write";

/** Represents an API key issued to a client. */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  permissions: ApiKeyPermission[];
}

/** Payload for creating a new API key. */
export interface CreateApiKeyInput {
  name: string;
  permissions: ApiKeyPermission[];
}
