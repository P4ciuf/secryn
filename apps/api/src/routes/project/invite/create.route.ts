import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

interface CreateInviteParams {
  id: string;
}

interface CreateInviteBody {
  email: string;
}

/**
 * POST /projects/:id/invites
 *
 * Creates an invitation for a registered user to join a project and sends it via email.
 * The inviter must have the ALL or CREATE_INVITES permission in the target project.
 * Invites expire 7 days after creation.
 * Rate-limited to 10 requests per 5 minutes per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/projects/:id/invites",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Create a project invitation",
    description:
      "Creates an invitation link for a registered user to join a project. The inviter must have CREATE_INVITES or ALL permission in the project. An email with the invitation link is sent to the invitee. Rate-limited to 10 requests per 5 minutes.",
    operationId: "createProjectInvite",
    tags: ["Project Invite"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "The project ID" },
      },
    },
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email", description: "Email of the user to invite" },
      },
    },
    response: {
      200: {
        description: "Invitation created and email sent successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Invite ID" },
          slug: { type: "string", description: "Unique invitation slug" },
          projectId: { type: "string", description: "ID of the project" },
          expiresAt: { type: "string", format: "date-time", description: "Expiry date" },
          createdAt: { type: "string", format: "date-time", description: "Creation date" },
        },
      },
      400: { description: "Bad request — missing body or user already a member" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — inviter lacks permission to create invites" },
      404: { description: "Not found — project or invited user does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const project = await projectService.createInvite(
      (req.body as CreateInviteBody).email,
      (req.params as CreateInviteParams).id,
    );

    return reply.code(200).send(project);
  },
})) satisfies AppRouteObject;
