import { ApiError } from "../errors/apiError";

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
 * Silently returns if the user is the owner; throws {@link ApiError.Forbidden} otherwise.
 *
 * @param userId - The authenticated user performing the operation
 * @param projectOwnerId - The ID of the project's current owner
 * @throws {ApiError} with HTTP 403 if userId does not match the project owner
 */
export const ownsProject = (userId: string, projectOwnerId: string) => {
  if (!PolicyProject.isProjectOwner(userId, projectOwnerId)) throw ApiError.Forbidden();
};

/**
 * Returns a Date exactly 7 days from now (168 hours).
 * Used as the default TTL for project invitations.
 *
 * @returns A Date object representing the invitation expiry timestamp
 */
export const generateInvitationExpiryDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

import { ProjectMemberPermission, type ProjectMemberPermissionAssignment } from "@prisma/client";

/**
 * Centralised authorization helper for project-scoped operations.
 * Contains static policy checks that are stateless and reusable across
 * the project service layer without instantiation.
 */
export class PolicyProject {
  /**
   * Checks whether any of the given permission assignments grant the requested
   * operation. The `ALL` permission acts as a master override — if present,
   * every other permission check is skipped.
   *
   * @param userPermission - The set of permission assignments for a project member
   * @param permission - The specific permission required for the operation
   * @returns `true` if the member holds the requested permission or the `ALL` override
   */
  static async hasPermission(
    userPermission: ProjectMemberPermissionAssignment[],
    permission: ProjectMemberPermission,
  ): Promise<boolean> {
    const userPermissions = userPermission.map((permission) => permission.permission);

    if (userPermissions.includes(ProjectMemberPermission.ALL)) return true;
    if (userPermissions.includes(permission)) return true;

    return false;
  }

  /**
   * Compares two user IDs to determine project ownership.
   *
   * @param userId - The authenticated user performing the operation
   * @param projectOwnerId - The ID of the project's current owner
   * @returns `true` if the two IDs match, meaning the user is the project owner
   */
  static isProjectOwner(userId: string, projectOwnerId: string): boolean {
    return userId === projectOwnerId;
  }
}
