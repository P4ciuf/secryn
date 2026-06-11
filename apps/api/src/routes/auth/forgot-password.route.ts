import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";
import { AuthService } from "../../core/auth/service.js";
import type { ForgotPasswordBody } from "@repo/shared";

/**
 * POST /auth/forgot-password
 *
 * Initiates a password reset for the given email address. Always returns
 * { ok: true } regardless of whether the email is registered, to prevent
 * user enumeration. If the email exists, a reset token is generated and
 * sent to the user. Rate‑limited to 3 requests per 15 minutes per email.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/forgot-password",
  config: {
    rateLimit: {
      max: 3,
      timeWindow: 15 * 60 * 1000, // 15 min
    },
  },
  schema: {
    summary: "Request a password reset",
    description:
      "Sends a password reset email to the given address if it belongs to a registered user. Always returns ok: true to prevent email enumeration. Rate-limited to 3 attempts per 15 minutes.",
    operationId: "authForgotPassword",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email"],
      properties: {
        email: {
          type: "string",
          format: "email",
          description: "The email address of the account",
        },
      },
    },
    response: {
      200: {
        description: "Reset email sent (or silently ignored if email not registered)",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      400: { description: "Bad request — missing or invalid fields" },
    },
  },
  handler: async (req, reply) => {
    const { email } = req.body as ForgotPasswordBody;
    const authService = await AuthService.Instance(req);
    const result = await authService.forgotPassword({ email });
    return reply.send(result);
  },
})) satisfies AppRouteObject;
