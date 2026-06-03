import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

/**
 * DELETE /projects/:projectId/members/:memberId
 *
 * Removes a member from a project. The caller must hold the ALL or REMOVE_MEMBERS
 * permission in the target project. A user cannot remove themselves.
 * Rate-limited to 10 requests per 5 minutes per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "DELETE",
  url: "/projects/:projectId/members/:memberId",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Remove a member from a project",
    description:
      "Removes a member from a project. The caller must have ALL or REMOVE_MEMBERS permission in the project. A user cannot remove themselves. Rate-limited to 10 requests per 5 minutes.",
    operationId: "removeProjectMember",
    tags: ["Project Member"],
    params: {
      type: "object",
      required: ["projectId", "memberId"],
      properties: {
        projectId: { type: "string", description: "The project ID" },
        memberId: { type: "string", description: "The ID of the member to remove" },
      },
    },
    response: {
      204: {
        description: "Member removed successfully — no content",
        type: "null",
      },
      400: { description: "Bad request — caller tried to remove themselves" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — caller lacks REMOVE_MEMBERS or ALL permission" },
      404: { description: "Not found — project or member does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    await projectService.removeMemberToProject(
      (req.params as { memberId: string }).memberId,
      (req.params as { projectId: string }).projectId,
    );

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
