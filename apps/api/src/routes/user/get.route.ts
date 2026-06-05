import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import { UserService } from "../../modules/user/service.js";

/**
 * GET /users/:userId
 *
 * Retrieves a user by ID. Use '@me' to fetch the currently authenticated user.
 * The '@me' alias returns the caller's own profile; any other ID returns the
 * matching user (or null if not found). Rate-limited to 50 requests per hour.
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/users/:userId",
  config: {
    rateLimit: {
      max: 50,
      timeWindow: 60 * 60 * 1000, // 1 hour
    },
  },
  schema: {
    summary: "Get a user by ID",
    description:
      "Retrieves a user by their unique ID. Use '@me' as the userId to fetch the currently authenticated user's profile. Rate-limited to 50 requests per hour.",
    operationId: "getUser",
    tags: ["User"],
    params: {
      type: "object",
      required: ["userId"],
      properties: {
        userId: {
          type: "string",
          description: "The user ID, or '@me' for the authenticated user",
          example: "@me",
        },
      },
    },
    response: {
      200: {
        description: "User profile retrieved successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Unique user identifier" },
          email: { type: "string", description: "User email address" },
          username: { type: "string", description: "Display name" },
          role: { type: "string", description: "User role" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — requesting another user's data without permission" },
      404: { description: "Not found — user does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const params = req.params as { userId: string };
    const userService = await UserService.Instance(req.user.id);

    if (params.userId === "@me") {
      const user = await userService.getUserSafe({ id: req.user.id });
      return reply.code(200).send(user);
    }

    const user = await userService.getUserSafe({ id: params.userId });

    return reply.code(200).send(user);
  },
})) satisfies AppRouteObject;
