import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { ProjectService } from "@/services/project";
import { ApiError } from "@/errors/apiError";

/**
 * DELETE /api/projects/:id/members/:memberId
 *
 * Removes a member from a project. The project owner cannot be removed.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not a project admin.
 */
export const DELETE = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getAuthenticatedUser(request);
  if (!user) throw ApiError.Unauthorized();

  const { id, memberId } = await (ctx as { params: Promise<{ id: string; memberId: string }> })
    .params;
  const projectService = await ProjectService.Instance(user.id);
  await projectService.removeMemberToProject(memberId, id);

  return NextResponse.json({ success: true }, { status: 200 });
});
