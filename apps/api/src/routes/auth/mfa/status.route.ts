import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";
import type { MFAStatusResponse } from "@repo/shared";

/**
 * GET /auth/mfa/status
 * Returns whether MFA is currently enabled for the authenticated user.
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/auth/mfa/status",
  schema: {
    summary: "Get MFA status",
    description:
      "Returns whether multi-factor authentication is enabled for the authenticated user.",
    operationId: "mfaStatus",
    tags: ["MFA"],
    response: {
      200: {
        description: "MFA status",
        type: "object",
        properties: {
          enabled: { type: "boolean" },
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
    const user = await userService.getUserOrThrow({ id: req.user.id });
    return { enabled: user.isMFAEnabled } satisfies MFAStatusResponse;
  },
})) satisfies AppRouteObject;
