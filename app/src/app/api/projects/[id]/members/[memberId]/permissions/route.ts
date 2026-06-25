import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";
import { ProjectMemberPermission } from "@prisma/client";
import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * Normalises a permission string to a {@link ProjectMemberPermission} enum value.
 * Performs a case-insensitive match against known enum members. Returns null
 * for unrecognised values so the caller can silently ignore invalid input.
 *
 * @param value - A raw permission string from the request body
 * @returns The matching enum member, or null if no match exists
 */
function parsePermission(value: string): ProjectMemberPermission | null {
  const upper = value.toUpperCase();
  if (Object.values(ProjectMemberPermission).includes(upper as ProjectMemberPermission)) {
    return upper as ProjectMemberPermission;
  }
  return null;
}

/**
 * PUT /api/projects/:id/members/:memberId/permissions
 *
 * Adds or removes granular permissions for a project member. Permissions are
 * validated against the `ProjectMemberPermission` enum; unknown values are
 * silently ignored.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not a project admin.
 */
export const PUT = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id, memberId } = await (ctx as { params: Promise<{ id: string; memberId: string }> })
    .params;
  const body = (await request.json()) as {
    addPermissions?: string[];
    removePermissions?: string[];
  };

  const projectService = await ProjectService.Instance(user.id as string);

  if (body.addPermissions && body.addPermissions.length > 0) {
    const perms = body.addPermissions
      .map(parsePermission)
      .filter((p): p is ProjectMemberPermission => p !== null);
    if (perms.length > 0) {
      await projectService.addPermissionsToMember(memberId, id, perms);
    }
  }

  if (body.removePermissions && body.removePermissions.length > 0) {
    const perms = body.removePermissions
      .map(parsePermission)
      .filter((p): p is ProjectMemberPermission => p !== null);
    if (perms.length > 0) {
      await projectService.removePermissionsFromMember(memberId, id, perms);
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
});
