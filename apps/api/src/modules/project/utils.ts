import type { FullProject } from "./repository.js";

/**
 * Converts a project name to a URL-safe slug by replacing whitespace with
 * hyphens and lowercasing the result.
 *
 * @param name - The raw project display name
 * @returns The slugified string (e.g. "My Project" → "my-project")
 */
export function generateSlugFromName(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}

/**
 * Checks whether the given user is the owner of the specified project.
 * Ownership is determined by comparing the user ID against `project.owner.id`.
 *
 * @param userId - The user ID to test
 * @param project - The project whose owner is checked
 * @returns `true` when the user is the project owner
 */
export function isOwnerProject(userId: string, project: FullProject): boolean {
  return project.owner.id === userId;
}
