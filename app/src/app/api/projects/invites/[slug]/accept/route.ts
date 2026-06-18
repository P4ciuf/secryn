import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { ProjectService } from "@/services/project";
import { ApiError } from "@/errors/apiError";

/**
 * POST /api/projects/invites/:slug/accept
 *
 * Accepts a pending project invite identified by its slug. The authenticated
 * user is added as a project member.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the invite does not exist or has expired.
 */
export const POST = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getAuthenticatedUser(request);
  if (!user) throw ApiError.Unauthorized();

  const { slug } = await (ctx as { params: Promise<{ slug: string }> }).params;
  const projectService = await ProjectService.Instance(user.id);
  await projectService.acceptInvite(slug);

  return NextResponse.json({ success: true }, { status: 200 });
});
