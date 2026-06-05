import { AuthService } from "../../core/auth/service.js";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";

/**
 * POST /auth/refresh
 * Issues a new auth JWT to extend the session without re-authentication.
 * The existing cookie must contain a valid (or recently expired) JWT.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/refresh",
  config: {
    rateLimit: {
      max: 30,
      timeWindow: 60 * 60 * 1000,
    },
  },
  schema: {
    summary: "Refresh the auth session",
    description:
      "Issues a new 30-minute JWT and sets it as an httpOnly cookie, extending the current session without requiring re-authentication.",
    operationId: "authRefresh",
    tags: ["Auth"],
    response: {
      200: {
        description: "Token refreshed successfully",
        type: "object",
        properties: {
          ok: { type: "boolean" },
        },
      },
      401: { description: "Unauthorized — missing or invalid JWT" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw new Error("Unauthorized");
    const authService = await AuthService.Instance(req);
    const jwt = await authService.refreshJWT();
    reply.setCookie("auth-token", jwt, AuthService.cookieConfig);
    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
