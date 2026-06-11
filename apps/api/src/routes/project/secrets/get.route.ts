import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

/**
 * {@code GET /projects/secrets/:id}
 *
 * Retrieves a single secret by its ID with the value decrypted.
 * The caller must be a member of the project the secret belongs to.
 * Rate-limited to 10 requests per 5 minutes.
 *
 * @param fastify - Fastify instance used to register the route
 * @returns An {@link AppRouteObject} ready for registration
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/projects/secrets/:id",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Get a secret by ID",
    description:
      "Retrieves a single secret by its ID. The authenticated user must be a member of the project the secret belongs to. Rate-limited to 10 requests per 5 minutes.",
    operationId: "getSecret",
    tags: ["Secret"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "The ID of the secret" },
      },
    },
    response: {
      200: {
        description: "Secret retrieved successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Unique secret identifier" },
          name: { type: "string" },
          value: { type: "string" },
          notes: { type: "string" },
          projectId: { type: "string" },
          addedById: { type: "string" },
          updatedById: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      404: { description: "Not found — secret does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user && !req.apiKey) throw AppError.Unauthorized();
    // API keys without at least "read" scope are rejected
    if (req.apiKey && !req.apiKey.permissions.includes("read") && req.apiKey.isActive) {
      throw AppError.Unauthorized();
    }

    const projectService = await ProjectService.Instance(req.user?.id || req.apiKey!.userId);
    const params = req.params as { id: string };

    const secret = await projectService.getSecret(params.id);

    return reply.code(200).send(secret);
  },
})) satisfies AppRouteObject;
