import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { projectRepository } from "@/repositories/project";
import { ApiError } from "@/errors/apiError";

/**
 * GET /api/projects/invites/:slug
 *
 * Looks up a project invite by its slug without requiring authentication.
 * Used by the invite acceptance page to show the project name before the user
 * accepts.
 *
 * @throws 404 if the invite does not exist.
 */
export const GET = withErrorHandler(async (_request, ctx: unknown) => {
  const { slug } = await (ctx as { params: Promise<{ slug: string }> }).params;
  const invite = await projectRepository.findProjectInvite({ slug });

  if (!invite) throw ApiError.ResourceNotFound("Invite");

  return NextResponse.json(
    {
      success: true,
      invite: {
        id: invite.id,
        slug: invite.slug,
        projectId: invite.projectId,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      },
    },
    { status: 200 },
  );
});
