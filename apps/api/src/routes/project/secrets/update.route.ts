import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";
import type { UpdateSecretInput } from "@repo/shared";

/**
 * {@code PUT /projects/secrets/:id}
 *
 * Updates an existing secret's name, notes, and/or value.
 * All fields are optional — only the fields provided are updated.
 * Requires the {@code UPDATE_SECRETS} or {@code ALL} permission.
 * Rate-limited to 10 requests per 5 minutes.
 *
 * @param fastify - Fastify instance used to register the route
 * @returns An {@link AppRouteObject} ready for registration
 */
export default ((fastify: FastifyInstance) => ({
  method: "PUT",
  url: "/projects/secrets/:id",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Update a secret",
    description:
      "Updates an existing secret by its ID. The authenticated user must be a member of the project with the UPDATE_SECRETS or ALL permission. All fields are optional — only the fields provided will be updated. Rate-limited to 10 requests per 5 minutes.",
    operationId: "updateSecret",
    tags: ["Secret"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "The ID of the secret" },
      },
    },
    body: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The new name of the secret",
          example: "DATABASE_URL",
        },
        value: {
          type: "string",
          description: "The new value of the secret",
          example: "postgresql://user:pass@localhost:5432/newdb",
        },
        notes: {
          type: "string",
          description: "The new notes of the secret",
          example: "Staging database connection string",
        },
      },
    },
    response: {
      200: {
        description: "Secret updated successfully",
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
      400: { description: "Bad request — invalid body" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — user lacks UPDATE_SECRETS or ALL permission" },
      404: { description: "Not found — secret does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user && !req.apiKey) throw AppError.Unauthorized();
    // API keys scoped to "read" are rejected on write endpoints
    if (req.apiKey && !req.apiKey.permissions.includes("write") && req.apiKey.isActive) {
      throw AppError.Unauthorized();
    }

    const projectService = await ProjectService.Instance(req.user?.id || req.apiKey!.userId);
    const params = req.params as { id: string };
    const body = req.body as UpdateSecretInput;
    const secret = await projectService.updateSecret(params.id, body);

    return reply.code(200).send(secret);
  },
})) satisfies AppRouteObject;
