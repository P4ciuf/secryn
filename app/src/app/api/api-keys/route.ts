import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ApiKeyService } from "@/services/apiKey";
import type { CreateApiKeyInput, ApiKeyPermission } from "@repo/shared";

import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/api-keys
 *
 * Lists all API keys belonging to the authenticated user. Only metadata is
 * returned — the raw key value is never exposed after creation.
 *
 * @throws 401 if the request is unauthenticated.
 */
export const GET = withErrorHandler(async (_request: Request) => {
  const user = await getSessionOrThrow(await auth());

  const apiKeyService = await ApiKeyService.Instance(user.id as string as string);
  const apiKeys = await apiKeyService.getUserApiKeys();

  return NextResponse.json(
    {
      success: true,
      apiKeys: apiKeys ?? [],
    },
    { status: 200 },
  );
});

/**
 * POST /api/api-keys
 *
 * Creates a new API key with a cryptographically random value. The raw key is
 * returned exactly once in the 201 response — it cannot be retrieved later.
 *
 * @throws 400 if `name` is missing or permissions are empty/invalid.
 * @throws 401 if the request is unauthenticated.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const user = await getSessionOrThrow(await auth());

  const body = (await request.json()) as CreateApiKeyInput;

  if (!body.name || !body.permissions || body.permissions.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Name and at least one permission are required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const validPermissions: ApiKeyPermission[] = ["read", "write"];
  for (const perm of body.permissions) {
    if (!validPermissions.includes(perm)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid permission: ${perm}. Valid: read, write.`,
          code: "BAD_REQUEST",
          statusCode: 400,
        },
        { status: 400 },
      );
    }
  }

  const apiKeyService = await ApiKeyService.Instance(user.id as string as string);
  const apiKey = await apiKeyService.generateApiKey({
    name: body.name,
    permissions: body.permissions,
  });

  return NextResponse.json({ success: true, apiKey }, { status: 201 });
});
