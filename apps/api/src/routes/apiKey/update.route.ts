import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import { ApiKeyService } from "../../core/apiKeys/service.js";
import type { UpdateApiKeyInput } from "@repo/shared";
import { ApiKeyPermissions } from "@prisma/client";

/**
 * PUT /api-keys/:id
 *
 * Updates an API key's name, active status, and/or permissions.
 * All fields are optional — only provided properties are modified.
 * Rate-limited to 5 requests per hour.
 */
export default ((fastify: FastifyInstance) => ({
  method: "PUT",
  url: "/api-keys/:id",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 60 * 60 * 1000, // 1 hour
    },
  },
  schema: {
    summary: "Update an API key",
    description:
      "Updates an existing API key. You can rename it, toggle its active status, or modify permissions by adding or removing them individually. All fields are optional. Rate-limited to 5 requests per hour.",
    operationId: "updateApiKey",
    tags: ["API Key"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "The API key ID to update",
          example: "key_abc123",
        },
      },
    },
    body: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "New label for the API key",
          example: "Updated Key Name",
        },
        isActive: {
          type: "boolean",
          description: "Toggle the active status of the key",
          example: false,
        },
        addPermissions: {
          type: "array",
          description: "Permissions to add to the key",
          items: {
            type: "string",
            enum: ["READ", "WRITE"],
          },
        },
        removePermissions: {
          type: "array",
          description: "Permissions to remove from the key",
          items: {
            type: "string",
            enum: Object.values(ApiKeyPermissions),
          },
        },
      },
    },
    response: {
      200: {
        description: "API key updated successfully",
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          userId: { type: "string" },
          isActive: { type: "boolean" },
          permissions: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      404: { description: "Not found — API key does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const params = req.params as { id: string };
    const apiKeyService = await ApiKeyService.Instance(req.user.id);

    const body = req.body as UpdateApiKeyInput;

    if (body.name !== undefined) {
      await apiKeyService.updateApiKeyName(params.id, body.name);
    }

    if (body.isActive !== undefined) {
      await apiKeyService.updateApiKeyStatus(params.id, body.isActive);
    }

    if (body.addPermissions || body.removePermissions) {
      await apiKeyService.updateApiKeyPermissions(params.id, {
        addPermissions: body.addPermissions || [],
        removePermissions: body.removePermissions || [],
      });
    }

    const apiKey = await apiKeyService.getApiKeyOrThrow({ id: params.id });
    return reply.code(200).send(apiKey);
  },
})) satisfies AppRouteObject;
