import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";
import type { MFAEnableBody } from "@repo/shared";

/**
 * POST /auth/mfa/enable
 * Verifies a TOTP token against the pending secret and activates MFA on the account.
 * Returns the 10 backup recovery codes (shown once).
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/mfa/enable",
  schema: {
    summary: "Enable MFA",
    description:
      "Verifies a TOTP token and activates multi-factor authentication. Returns one-time backup recovery codes.",
    operationId: "mfaEnable",
    tags: ["MFA"],
    body: {
      type: "object",
      required: ["token"],
      properties: {
        token: { type: "string", description: "6-digit TOTP code from authenticator app" },
      },
    },
    response: {
      200: {
        description: "MFA enabled successfully",
        type: "object",
        properties: {
          recoveryCodes: {
            type: "array",
            items: { type: "string" },
            description: "One-time backup recovery codes",
          },
        },
      },
      400: { description: "Bad request — setup not initialized" },
      401: { description: "Unauthorized or invalid TOTP code" },
      409: { description: "MFA already enabled" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");
    const { token } = req.body as MFAEnableBody;
    const userService = await UserService.Instance(req.user.id);
    const recoveryCodes = await userService.enableMFA(token);
    return reply.send({ recoveryCodes });
  },
})) satisfies AppRouteObject;
