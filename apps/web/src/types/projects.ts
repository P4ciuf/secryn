/** A project that groups related secrets. */
export interface Project {
  id: string;
  name: string;
  description: string;
  secretCount: number;
  updatedAt: string;
  color: string;
}

/** Payload for creating a new project. */
export interface CreateProjectInput {
  name: string;
  description: string;
}
