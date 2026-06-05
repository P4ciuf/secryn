import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";

/**
 * GET /auth/mfa/recovery-codes
 * Returns the list of valid (unused) recovery codes.
 *
 * POST /auth/mfa/recovery-codes
 * Regenerates recovery codes (deletes old ones, creates 10 new ones).
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/auth/mfa/recovery-codes",
  schema: {
    summary: "Get recovery codes",
    description:
      "Returns the list of valid (unused) MFA recovery codes for the authenticated user.",
    operationId: "mfaGetRecoveryCodes",
    tags: ["MFA"],
    response: {
      200: {
        description: "List of valid recovery codes",
        type: "object",
        properties: {
          codes: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      401: { description: "Unauthorized" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");
    const userService = await UserService.Instance(req.user.id);
    const codes = await userService.getRecoveryCodes();
    return { codes };
  },
})) satisfies AppRouteObject;
