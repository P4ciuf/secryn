import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";

/**
 * POST /auth/mfa/recovery-codes/regenerate
 * Regenerates all recovery codes: deletes existing ones and creates 10 new ones.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/mfa/recovery-codes/regenerate",
  schema: {
    summary: "Regenerate recovery codes",
    description:
      "Deletes all existing recovery codes and generates 10 new ones. Old codes become invalid immediately.",
    operationId: "mfaRegenerateRecoveryCodes",
    tags: ["MFA"],
    response: {
      200: {
        description: "New recovery codes generated",
        type: "object",
        properties: {
          codes: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      401: { description: "Unauthorized" },
      409: { description: "MFA is not enabled" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");
    const userService = await UserService.Instance(req.user.id);
    const codes = await userService.regenerateRecoveryCodes();
    return { codes };
  },
})) satisfies AppRouteObject;
