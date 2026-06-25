import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";
import { ApiError } from "@/errors/apiError";
import type { UpdateSecretInput } from "@repo/shared";
import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/projects/:id/secrets/:secretId
 *
 * Returns a single secret including its decrypted value. Accessible only by
 * project members with read permission on the secret.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the secret does not exist or access is denied.
 */
export const GET = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { secretId } = await (ctx as { params: Promise<{ secretId: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  const secret = await projectService.getSecretOrThrow(secretId);

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
    { status: 200 },
  );
});

/**
 * PUT /api/projects/:id/secrets/:secretId
 *
 * Updates a secret's name, value, and/or notes. Requires write permission on
 * the secret.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the secret does not exist or access is denied.
 */
export const PUT = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { secretId } = await (ctx as { params: Promise<{ secretId: string }> }).params;
  const body = (await request.json()) as UpdateSecretInput;

  const projectService = await ProjectService.Instance(user.id as string);
  const secret = await projectService.updateSecret(secretId, {
    name: body.name,
    value: body.value,
    notes: body.notes,
  });

  if (!secret) throw ApiError.ResourceNotFound("Secret");

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
    { status: 200 },
  );
});

/**
 * DELETE /api/projects/:id/secrets/:secretId
 *
 * Permanently deletes a secret. Requires write permission.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the secret does not exist or access is denied.
 */
export const DELETE = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { secretId } = await (ctx as { params: Promise<{ secretId: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  await projectService.deleteSecret(secretId);

  return NextResponse.json({ success: true }, { status: 200 });
});
