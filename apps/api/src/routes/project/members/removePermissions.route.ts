import { ProjectMemberPermission } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

interface RemovePermissionsParams {
  projectId: string;
  memberId: string;
}

interface RemovePermissionsBody {
  permissions: ProjectMemberPermission[];
}

/**
 * DELETE /projects/:projectId/members/:memberId/permissions
 *
 * Removes one or more permissions from an existing project member.
 * The caller must hold the ALL or MANAGE_MEMBERS permission in the target project.
 * Rate-limited to 10 requests per 5 minutes per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "DELETE",
  url: "/projects/:projectId/members/:memberId/permissions",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Remove permissions from a project member",
    description:
      "Removes one or more permissions from an existing project member. The caller must have the MANAGE_MEMBERS or ALL permission in the project. Rate-limited to 10 requests per 5 minutes.",
    operationId: "removeProjectMemberPermissions",
    tags: ["Project Member"],
    params: {
      type: "object",
      required: ["projectId", "memberId"],
      properties: {
        projectId: { type: "string", description: "The project ID" },
        memberId: { type: "string", description: "The ID of the project member" },
      },
    },
    body: {
      type: "object",
      required: ["permissions"],
      properties: {
        permissions: {
          type: "array",
          description: "List of permissions to remove",
          items: {
            type: "string",
            enum: Object.values(ProjectMemberPermission),
          },
        },
      },
    },
    response: {
      204: {
        description: "Permissions removed successfully — no content",
        type: "null",
      },
      400: { description: "Bad request — invalid body or permissions" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — caller lacks MANAGE_MEMBERS or ALL permission" },
      404: { description: "Not found — project or member does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const params = req.params as RemovePermissionsParams;
    const body = req.body as RemovePermissionsBody;
    await projectService.removePermissionsFromMember(
      params.memberId,
      params.projectId,
      body.permissions,
    );

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
