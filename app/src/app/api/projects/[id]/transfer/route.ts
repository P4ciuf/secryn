import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";

import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * POST /api/projects/:id/transfer
 *
 * Transfers project ownership to another user. The target user must already
 * be a project member. The current owner becomes a regular member after the
 * transfer.
 *
 * @throws 400 if `toUserId` is missing.
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not the current project owner.
 */
export const POST = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const body = (await request.json()) as { toUserId: string };

  if (!body.toUserId) {
    return NextResponse.json(
      { success: false, message: "toUserId is required.", code: "BAD_REQUEST", statusCode: 400 },
      { status: 400 },
    );
  }

  const projectService = await ProjectService.Instance(user.id as string);
  const project = await projectService.transferOwnerProject({ id }, body.toUserId);

  return NextResponse.json(
    {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        ownerId: project.ownerId,
      },
    },
    { status: 200 },
  );
});
