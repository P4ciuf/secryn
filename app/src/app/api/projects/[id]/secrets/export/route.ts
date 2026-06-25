import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";
import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/projects/:id/secrets/export
 *
 * Exports all project secrets as a `.env` file download with decrypted values.
 * Requires read permission on the project.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester lacks read access.
 */
export const GET = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  const envContent = await projectService.exportProjectSecrets(id);

  return new NextResponse(envContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="secrets-${id}.env"`,
    },
  });
});
