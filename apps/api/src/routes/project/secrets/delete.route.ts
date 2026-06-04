import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

type Params = {
  id: string;
};

/**
 * {@code DELETE /projects/secrets/:id}
 *
 * Permanently deletes a secret by its ID.
 * Requires the {@code DELETE_SECRETS} or {@code ALL} permission.
 * Rate-limited to 10 requests per 5 minutes.
 *
 * @param fastify - Fastify instance used to register the route
 * @returns An {@link AppRouteObject} ready for registration
 */
export default ((fastify: FastifyInstance) => ({
  method: "DELETE",
  url: "/projects/secrets/:id",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Delete a secret",
    description:
      "Permanently deletes a secret by its ID. The authenticated user must have the DELETE_SECRETS or ALL permission in the project the secret belongs to. Rate-limited to 10 requests per 5 minutes.",
    operationId: "deleteSecret",
    tags: ["Secret"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "The ID of the secret" },
      },
    },
    response: {
      204: {
        description: "Secret deleted successfully — no content",
        type: "null",
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — user lacks DELETE_SECRETS or ALL permission" },
      404: { description: "Not found — secret does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const params = req.params as Params;
    await projectService.deleteSecret(params.id);

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
