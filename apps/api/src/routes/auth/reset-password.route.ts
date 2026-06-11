import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";
import { AuthService } from "../../core/auth/service.js";
import type { ResetPasswordBody } from "@repo/shared";

/**
 * POST /auth/reset-password
 *
 * Resets a user's password using a valid token from the forgot-password flow.
 * The token is single-use and expires after 1 hour.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/reset-password",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 15 * 60 * 1000, // 15 min
    },
  },
  schema: {
    summary: "Reset password with a token",
    description:
      "Resets the account password using a valid single-use token sent via email. Tokens expire after 1 hour.",
    operationId: "authResetPassword",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["token", "password"],
      properties: {
        token: {
          type: "string",
          description: "The reset token from the forgot-password email",
        },
        password: {
          type: "string",
          description: "The new password (minimum 8 characters)",
          minLength: 8,
        },
      },
    },
    response: {
      200: {
        description: "Password successfully reset",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      400: { description: "Bad request — missing or invalid fields" },
      401: { description: "Unauthorized — invalid, expired, or already used token" },
    },
  },
  handler: async (req, reply) => {
    const body = req.body as ResetPasswordBody;
    const authService = await AuthService.Instance(req);
    const result = await authService.resetPassword(body);
    return reply.send(result);
  },
})) satisfies AppRouteObject;
