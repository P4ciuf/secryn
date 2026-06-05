import { AuthService } from "../../../core/auth/service.js";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import type { MFAConfirmBody } from "@repo/shared";

/**
 * POST /auth/mfa/confirm
 * Completes the MFA login flow by verifying a TOTP code.
 * On success, sets the auth JWT as an httpOnly cookie.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/mfa/confirm",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000,
    },
  },
  schema: {
    summary: "Confirm MFA login",
    description:
      "Verifies a TOTP code during login when MFA is enabled. Sets the auth JWT as an httpOnly cookie on success.",
    operationId: "mfaConfirm",
    tags: ["MFA"],
    body: {
      type: "object",
      required: ["token", "mfaToken"],
      properties: {
        token: { type: "string", description: "6-digit TOTP code from authenticator app" },
        mfaToken: {
          type: "string",
          description: "Short-lived MFA token from the login response",
        },
      },
    },
    response: {
      200: {
        description: "MFA verified, JWT set as cookie",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      401: { description: "Invalid TOTP code or expired MFA token" },
      400: { description: "Bad request — missing fields" },
    },
  },
  handler: async (req, reply) => {
    const { token, mfaToken } = req.body as MFAConfirmBody;
    const authService = await AuthService.Instance(req);
    const jwt = await authService.confirmMFA(token, mfaToken);

    reply.setCookie("auth-token", jwt, AuthService.cookieConfig);

    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
