import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { ProjectService } from "@/services/project";
import { ApiError } from "@/errors/apiError";

/**
 * GET /api/projects/:id/members
 *
 * Lists all members of a project. The project owner and any existing member
 * are authorized to view the member list.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not a project member or owner.
 */
export const GET = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getAuthenticatedUser(request);
  if (!user) throw ApiError.Unauthorized();

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const projectService = await ProjectService.Instance(user.id);
  const project = await projectService.getProjectOrThrow({ id });

  if (project.ownerId !== user.id) {
    const member = project.members.find((m) => m.userId === user.id);
    if (!member) throw ApiError.Forbidden();
  }

  return NextResponse.json(
    {
      success: true,
      members: project.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        projectId: m.projectId,
        joinedAt: m.joinedAt.toISOString(),
      })),
    },
    { status: 200 },
  );
});
