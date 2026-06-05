import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

/**
 * {@code GET /projects/:projectId/secrets}
 *
 * Retrieves all secrets belonging to a project with values decrypted.
 * The caller must be a member of the project.
 * Rate-limited to 10 requests per 5 minutes.
 *
 * @param fastify - Fastify instance used to register the route
 * @returns An {@link AppRouteObject} ready for registration
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/projects/:projectId/secrets",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Get all secrets in a project",
    description:
      "Retrieves all secrets belonging to a project. The authenticated user must be a member of the project. Rate-limited to 10 requests per 5 minutes.",
    operationId: "getProjectSecrets",
    tags: ["Secret"],
    params: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: { type: "string", description: "The ID of the project" },
      },
    },
    response: {
      200: {
        description: "List of secrets belonging to the project",
        type: "array",
        items: {
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
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — user is not a member of the project" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const params = req.params as { projectId: string };
    const secrets = await projectService.getProjectSecrets(params.projectId);
    return reply.code(200).send(secrets);
  },
})) satisfies AppRouteObject;
