import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";
import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * POST /api/projects/:id/invites
 *
 * Creates a time-limited invite link for a project member. The invite slug can
 * be shared with the target user and redeemed via the accept endpoint.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not a project admin.
 */
export const POST = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const body = (await request.json()) as { email: string };

  if (!body.email) {
    return NextResponse.json(
      { success: false, message: "Email is required.", code: "BAD_REQUEST", statusCode: 400 },
      { status: 400 },
    );
  }

  const projectService = await ProjectService.Instance(user.id as string);
  const invite = await projectService.createInvite(body.email, id);

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
    { status: 201 },
  );
});
