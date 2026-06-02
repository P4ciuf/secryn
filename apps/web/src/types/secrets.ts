/** A single secret key-value pair within a project. */
export interface Secret {
  id: string;
  name: string;
  value: string;
  updatedAt: string;
}

/** Payload for creating a new secret. */
export interface CreateSecretInput {
  name: string;
  value: string;
}

/** A project's secrets grouped together, including the project name. */
export interface ProjectSecretsData {
  name: string;
  secrets: Secret[];
}
