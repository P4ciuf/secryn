import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";
import type { CreateSecretInput } from "@repo/shared";

import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/projects/:id/secrets
 *
 * Lists all secrets in a project with decrypted values. Requires read
 * permission on the project.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester lacks read access.
 */
export const GET = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  const secrets = await projectService.getProjectSecrets(id);

  return NextResponse.json(
    {
      success: true,
      secrets: secrets.map((s) => ({
        id: s.id,
        name: s.name,
        value: s.value,
        notes: s.notes,
        projectId: s.projectId,
        addedById: s.addedById,
        updatedById: s.updatedById,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    },
    { status: 200 },
  );
});

/**
 * POST /api/projects/:id/secrets
 *
 * Creates a new secret in the project. The value is encrypted at rest.
 * Requires write permission on the project.
 *
 * @throws 400 if `name` or `value` is missing.
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester lacks write access.
 */
export const POST = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const body = (await request.json()) as CreateSecretInput;

  if (!body.name || body.value === undefined) {
    return NextResponse.json(
      {
        success: false,
        message: "Name and value are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const projectService = await ProjectService.Instance(user.id as string);
  const secret = await projectService.createSecret(id, {
    name: body.name,
    value: body.value,
    notes: body.notes ?? "",
  });

  return NextResponse.json(
    {
      success: true,
      secret: {
        id: secret.id,
        name: secret.name,
        value: secret.value,
        notes: secret.notes,
        projectId: secret.projectId,
        addedById: secret.addedById,
        updatedById: secret.updatedById,
        createdAt: secret.createdAt.toISOString(),
        updatedAt: secret.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
});
