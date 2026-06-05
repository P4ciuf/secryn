import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";
import type { MFASetupResponse } from "@repo/shared";

/**
 * GET /auth/mfa/setup
 * Initiates MFA setup by generating a TOTP secret and QR code.
 * Does not activate MFA — the user must verify via POST /auth/mfa/enable.
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/auth/mfa/setup",
  schema: {
    summary: "Start MFA setup",
    description:
      "Generates a new TOTP secret and returns a QR code data URL and setup key for authenticator apps. Requires authentication.",
    operationId: "mfaSetup",
    tags: ["MFA"],
    response: {
      200: {
        description: "MFA setup data",
        type: "object",
        properties: {
          secret: { type: "string" },
          qrCode: { type: "string" },
          otpauthUrl: { type: "string" },
        },
      },
      401: { description: "Unauthorized" },
      409: { description: "MFA already enabled" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");
    const userService = await UserService.Instance(req.user.id);
    return userService.setupMFA() as Promise<MFASetupResponse>;
  },
})) satisfies AppRouteObject;
