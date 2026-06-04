import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { ProjectService } from "../../../modules/project/service.js";
import { AppError } from "../../../core/errors/appError.js";

interface TransferOwnershipParams {
  id: string;
}

interface TransferOwnershipBody {
  toUserId: string;
}

/**
 * POST /projects/:id/transfer
 *
 * Transfers ownership of a project to another user.
 * The target user must already be a member of the project.
 * Only the current project owner can initiate the transfer.
 * Rate-limited to 3 requests per hour per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/projects/:id/transfer",
  config: {
    rateLimit: {
      max: 3,
      timeWindow: 60 * 60 * 1000, // 1h
    },
  },
  schema: {
    summary: "Transfer project ownership",
    description:
      "Transfers ownership of a project to another user. The target user must already be a member of the project. Only the current project owner can initiate a transfer. Rate-limited to 3 requests per hour.",
    operationId: "transferProjectOwnership",
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
    body: {
      type: "object",
      required: ["toUserId"],
      properties: {
        toUserId: {
          type: "string",
          description: "ID of the user to transfer ownership to",
        },
      },
    },
    response: {
      204: {
        description: "Project ownership transferred successfully — no content",
        type: "null",
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — only the current owner can transfer ownership" },
      404: { description: "Not found — project or target member does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    await projectService.transferOwnerProject(
      { id: (req.params as TransferOwnershipParams).id },
      (req.body as TransferOwnershipBody).toUserId,
    );

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
