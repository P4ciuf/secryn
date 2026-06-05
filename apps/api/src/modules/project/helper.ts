import { AppError } from "../../core/errors/appError.js";
import { PolicyProject } from "./policy.js";

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
 * Ensures the given user is the project owner.
 * Silently returns if the user is the owner; throws {@link AppError.Forbidden} otherwise.
 *
 * @param userId - The authenticated user performing the operation
 * @param projectOwnerId - The ID of the project's current owner
 * @throws {AppError} with HTTP 403 if userId does not match the project owner
 */
export const ownsProject = (userId: string, projectOwnerId: string) => {
  if (!PolicyProject.isProjectOwner(userId, projectOwnerId)) throw AppError.Forbidden();
};

/**
 * Returns a Date exactly 7 days from now (168 hours).
 * Used as the default TTL for project invitations.
 *
 * @returns A Date object representing the invitation expiry timestamp
 */
export const generateInvitationExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
