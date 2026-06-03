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
