import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors/appError.js";
import type { AppRouteObject } from "../../types/route.js";
import type { UpdateUserInput } from "@repo/shared";
import { UserService } from "../../modules/user/service.js";

/**
 * PUT /users
 *
 * Updates the authenticated user's profile (name, email) or password.
 * Changing the password requires both the current and new password.
 * All fields are optional — only provided fields are updated.
 * Rate-limited to 10 requests per 5 minutes.
 */
export default ((fastify: FastifyInstance) => ({
  method: "PUT",
  url: "/users",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Update the authenticated user",
    description:
      "Updates the profile of the currently authenticated user. You can update the name, email, or password. Changing the password requires both the current password and the new password. Rate-limited to 10 requests per 5 minutes.",
    operationId: "updateUser",
    tags: ["User"],
    body: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "New display name",
          example: "Jane Doe",
        },
        email: {
          type: "string",
          description: "New email address",
          example: "jane@example.com",
        },
        currentPassword: {
          type: "string",
          description: "Current password (required when changing password)",
          example: "oldSecret123",
        },
        newPassword: {
          type: "string",
          description: "New password (required when changing password)",
          example: "newSecret456",
        },
      },
    },
    response: {
      201: {
        description: "User updated successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Unique user identifier" },
          email: { type: "string" },
          username: { type: "string" },
          role: { type: "string" },
          password: {
            type: "string",
            description: "Hashed password — never returned in safe contexts",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request — invalid or missing fields" },
      401: { description: "Unauthorized — missing or invalid JWT, or incorrect current password" },
      409: { description: "Conflict — email or username already taken" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const body = req.body as UpdateUserInput;
    const userService = await UserService.Instance(req.user.id);

    const updatedUser = await userService.updateUser(body);
    return reply.code(201).send(updatedUser);
  },
})) satisfies AppRouteObject;
