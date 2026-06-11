import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import { ApiKeyService } from "../../core/apiKeys/service.js";
import type { CreateApiKeyInput } from "@repo/shared";
import { ApiKeyPermissions } from "@prisma/client";

/**
 * POST /api-keys
 *
 * Generates a new API key for the authenticated user. The key value is
 * returned once at creation time and cannot be retrieved later.
 * Rate-limited to 5 requests per 30 minutes.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/api-keys",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 30 * 60 * 1000, // 30 min
    },
  },
  schema: {
    summary: "Create a new API key",
    description:
      "Generates a new API key for the authenticated user. The key value is returned once at creation time and cannot be retrieved later. Rate-limited to 5 requests per 30 minutes.",
    operationId: "createApiKey",
    tags: ["API Key"],
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "A label for the API key",
          example: "My CI/CD Key",
        },
        permissions: {
          type: "array",
          description: "List of permissions assigned to the key",
          items: {
            type: "string",
            enum: Object.values(ApiKeyPermissions),
          },
        },
      },
    },
    response: {
      201: {
        description: "API key created successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Unique key identifier" },
          name: { type: "string", description: "Key label" },
          key: { type: "string", description: "The API key value (shown only once)" },
          userId: { type: "string", description: "Owner user ID" },
          isActive: { type: "boolean", description: "Whether the key is active" },
          permissions: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request — missing or invalid fields" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const apiKeyService = await ApiKeyService.Instance(req.user.id);
    const body = req.body as CreateApiKeyInput;
    const apikey = await apiKeyService.generateApiKey(body);
    return reply.code(201).send(apikey);
  },
})) satisfies AppRouteObject;
