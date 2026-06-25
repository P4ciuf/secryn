import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";

import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

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
  const user = await getSessionOrThrow(await auth());

  const { slug } = await (ctx as { params: Promise<{ slug: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  await projectService.acceptInvite(slug);

  return NextResponse.json({ success: true }, { status: 200 });
});
