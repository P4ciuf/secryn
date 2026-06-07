import { AuthService } from "../../core/auth/service.js";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";
import type { LoginBody, LoginMFAResponse } from "@repo/shared";

/**
 * POST /auth/login
 * Authenticates a user with email and password.
 * - If MFA is not enabled: sets the JWT as an httpOnly cookie.
 * - If MFA is enabled: returns a short-lived MFA token that must be
 *   verified via {@code POST /auth/mfa/confirm} or {@code POST /auth/mfa/recovery}.
 * Rate-limited to 5 attempts per hour per client.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/login",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 60 * 60 * 1000, // 1h
    },
  },
  schema: {
    summary: "Authenticate a user",
    description:
      "Authenticates a user with email and password. Sets the JWT as an httpOnly cookie on success, or returns an MFA challenge when MFA is enabled. Rate-limited to 5 attempts per hour.",
    operationId: "authLogin",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: {
          type: "string",
          description: "Registered user email address",
        },
        password: {
          type: "string",
          description: "Account password",
          minLength: 8,
        },
      },
    },
    response: {
      200: {
        description:
          "Login successful — JWT set as cookie, or MFA challenge returned when MFA is enabled",
        type: "object",
        properties: {
          ok: { type: "boolean" },
          mfaRequired: { type: "boolean" },
          mfaToken: { type: "string" },
        },
      },
      400: { description: "Bad request — missing or invalid fields" },
      401: { description: "Unauthorized — incorrect password" },
      404: { description: "Not found — email not registered" },
      409: { description: "Conflict — user is already logged in" },
      500: { description: "Internal server error" },
    },
  },
  handler: async (req, reply) => {
    const authService = await AuthService.Instance(req);
    const result = await authService.login(req.body as LoginBody);

    if (typeof result === "string") {
      reply.setCookie("auth-token", result, AuthService.cookieConfig);
      return reply.send({ ok: true });
    }

    return reply.send(result as LoginMFAResponse);
  },
})) satisfies AppRouteObject;
