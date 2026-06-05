import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import { UserService } from "../../modules/user/service.js";

/**
 * DELETE /users
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * This action is irreversible. Rate-limited to 5 requests per 30 minutes.
 */
export default ((fastify: FastifyInstance) => ({
  method: "DELETE",
  url: "/users",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 30 * 60 * 1000, // 30 min
    },
  },
  schema: {
    summary: "Delete the authenticated user",
    description:
      "Permanently deletes the account of the currently authenticated user. This action is irreversible — all associated data including projects, secrets, and memberships will be removed. Rate-limited to 5 requests per 30 minutes.",
    operationId: "deleteUser",
    tags: ["User"],
    response: {
      204: {
        description: "User account deleted successfully — no content",
        type: "null",
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const userService = await UserService.Instance(req.user.id);

    await userService.deleteUser();

    return reply.code(204).send();
  },
})) satisfies AppRouteObject;
