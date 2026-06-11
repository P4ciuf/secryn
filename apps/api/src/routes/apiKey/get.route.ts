import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import { ApiKeyService } from "../../core/apiKeys/service.js";
import type { ApiKey } from "@repo/shared";

/**
 * GET /api-keys/:id
 *
 * Retrieves an API key by ID, or all user keys when {@code :id} is
 * {@code @all-user}. Rate-limited to 50 requests per hour.
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/api-keys/:id",
  config: {
    rateLimit: {
      max: 50,
      timeWindow: 60 * 60 * 1000, // 1 hour
    },
  },
  schema: {
    summary: "Get an API key by ID",
    description:
      "Retrieves a single API key by its ID. Use '@all-user' as the ID to retrieve all API keys belonging to the authenticated user. Rate-limited to 50 requests per hour.",
    operationId: "getApiKey",
    tags: ["API Key"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "The API key ID, or '@all-user' to list all user keys",
          example: "key_abc123",
        },
      },
    },
    response: {
      200: {
        description:
          "API key retrieved successfully, or list of all user keys when id is '@all-user'",
        oneOf: [
          {
            type: "object",
            description: "Single API key",
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
          {
            type: "array",
            description: "List of all user API keys",
            items: {
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
          },
        ],
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

    let apiKey: ApiKey | ApiKey[] | null;
    switch (params.id) {
      case "@all-user":
        apiKey = await apiKeyService.getUserApiKeys();
        break;
      default:
        apiKey = await apiKeyService.getApiKeyById(params.id);
        break;
    }
    if (!apiKey) throw AppError.NotFound("Api key not found");

    return reply.code(200).send(apiKey);
  },
})) satisfies AppRouteObject;
