import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { ProjectService } from "../../../modules/project/service.js";
import { AppError } from "../../../core/errors/appError.js";

/**
 * DELETE /projects/:id
 *
 * Permanently deletes a project and all associated data (secrets, members, invites).
 * Only the project owner may delete the project.
 * Rate-limited to 5 requests per hour per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "DELETE",
  url: "/projects/:id",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 60 * 60 * 1000, // 1h
    },
  },
  schema: {
    summary: "Delete a project",
    description:
      "Permanently deletes a project and all associated data (secrets, members, invites). Only the project owner can delete the project. Rate-limited to 5 requests per hour.",
    operationId: "deleteProject",
    tags: ["Project"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "The project id",
        },
      },
    },
    response: {
      204: {
        description: "Project deleted successfully — no content",
        type: "null",
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — only the project owner can delete the project" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = new ProjectService(req.user.id);
    await projectService.deleteProject({ id: (req.params as { id: string }).id });

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
