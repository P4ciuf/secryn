import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ApiKeyService } from "@/services/apiKey";
import type { UpdateApiKeyInput, ApiKeyPermission } from "@repo/shared";
import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/api-keys/:id
 *
 * Returns a single API key owned by the authenticated user. The raw key value
 * is never returned — only metadata such as name, permissions, and status.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the API key does not exist or belongs to another user.
 */
export const GET = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const apiKeyService = await ApiKeyService.Instance(user.id as string);
  const apiKey = await apiKeyService.getApiKeyOrThrow({ id });

  return NextResponse.json({ success: true, apiKey }, { status: 200 });
});

/**
 * PUT /api/api-keys/:id
 *
 * Updates an API key's name, active status, and/or permissions. At least one
 * field must be provided. Permissions are validated against the allowed set
 * (`read`, `write`) and silently filtered.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the API key does not exist or belongs to another user.
 */
export const PUT = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const body = (await request.json()) as UpdateApiKeyInput;

  const apiKeyService = await ApiKeyService.Instance(user.id as string);

  if (body.name !== undefined) {
    await apiKeyService.updateApiKeyName(id, body.name);
  }

  if (body.isActive !== undefined) {
    await apiKeyService.updateApiKeyStatus(id, body.isActive);
  }

  if (body.addPermissions || body.removePermissions) {
    const validPermissions: ApiKeyPermission[] = ["read", "write"];
    const addPerms = (body.addPermissions ?? []).filter((p) =>
      validPermissions.includes(p),
    ) as ApiKeyPermission[];
    const removePerms = (body.removePermissions ?? []).filter((p) =>
      validPermissions.includes(p),
    ) as ApiKeyPermission[];

    if (addPerms.length > 0 || removePerms.length > 0) {
      await apiKeyService.updateApiKeyPermissions(id, {
        addPermissions: addPerms,
        removePermissions: removePerms,
      });
    }
  }

  const apiKey = await apiKeyService.getApiKeyOrThrow({ id });

  return NextResponse.json({ success: true, apiKey }, { status: 200 });
});

/**
 * DELETE /api/api-keys/:id
 *
 * Permanently deletes an API key. Once deleted, any client using the key will
 * immediately lose access.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the API key does not exist or belongs to another user.
 */
export const DELETE = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const apiKeyService = await ApiKeyService.Instance(user.id as string as string);
  await apiKeyService.deleteApiKeyById(id);

  return NextResponse.json({ success: true }, { status: 200 });
});
