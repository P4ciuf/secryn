import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

/**
 * GET /projects/invites/:slug
 *
 * Accepts an invitation to join a project using the invitation slug.
 * The invite must be active (not expired) and the user must not already be a member.
 * On success, the user is added as a member and the invite is consumed.
 * Rate-limited to 10 requests per 5 minutes per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/projects/invites/:slug",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Accept a project invitation",
    description:
      "Accepts an invitation to join a project using the unique invitation slug. The invite must be active (not expired) and the user must not already be a member. On success, the user is added as a member and the invite is consumed. Rate-limited to 10 requests per 5 minutes.",
    operationId: "acceptProjectInvite",
    tags: ["Project Invite"],
    params: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "The invitation slug from the invite link" },
      },
    },
    response: {
      204: {
        description: "Successfully joined the project — no content",
        type: "null",
      },
      400: { description: "Bad request — invite expired or user already a member" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      404: { description: "Not found — invite does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    await projectService.acceptInvite((req.params as { slug: string }).slug);

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
