import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";

/**
 * POST /auth/mfa/disable
 * Disables MFA on the authenticated user's account.
 * Clears the TOTP secret and all recovery codes. Sends a confirmation email.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/mfa/disable",
  schema: {
    summary: "Disable MFA",
    description:
      "Disables multi-factor authentication on the account. Clears the TOTP secret and all recovery codes.",
    operationId: "mfaDisable",
    tags: ["MFA"],
    response: {
      200: {
        description: "MFA disabled successfully",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      401: { description: "Unauthorized" },
      409: { description: "MFA is not enabled" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");
    const userService = await UserService.Instance(req.user.id);
    await userService.disableMFA();
    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
