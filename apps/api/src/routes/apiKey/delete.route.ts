import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import { ApiKeyService } from "../../core/apiKeys/service.js";

/**
 * DELETE /api-keys/:id
 *
 * Permanently deletes an API key by its ID. The key can no longer be
 * used for authentication. Rate-limited to 5 requests per hour.
 */
export default ((fastify: FastifyInstance) => ({
  method: "DELETE",
  url: "/api-keys/:id",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 60 * 60 * 1000, // 1 hour
    },
  },
  schema: {
    summary: "Delete an API key",
    description:
      "Permanently deletes an API key by its ID. The key will no longer be usable for authentication. Rate-limited to 5 requests per hour.",
    operationId: "deleteApiKey",
    tags: ["API Key"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "The API key ID to delete",
          example: "key_abc123",
        },
      },
    },
    response: {
      204: {
        description: "API key deleted successfully — no content",
        type: "null",
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
    await apiKeyService.deleteApiKeyById(params.id);
    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
