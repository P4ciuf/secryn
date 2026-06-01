import { AuthService } from "../../core/auth/service.js";
import type { AppRouteObject } from "../../types/route.js";

/**
 * POST /auth/logout
 * Clears the auth-token cookie to terminate the session.
 * Rate-limited to 5 requests per hour per client.
 */
export default {
  method: "POST",
  url: "/auth/logout",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 60 * 60 * 1000, // 1h
    },
  },
  schema: {
    summary: "Log out the current user",
    description:
      "Clears the auth-token httpOnly cookie to terminate the session. Rate-limited to 5 requests per hour.",
    operationId: "authLogout",
    tags: ["Auth"],
    response: {
      200: {
        description: "Logout successful, cookie cleared",
        type: "object",
        properties: {
          ok: { type: "boolean" },
        },
      },
      500: { description: "Internal server error" },
    },
  },
  handler: async (req, reply) => {
    reply.clearCookie("auth-token", AuthService.cookieConfig);
    return reply.send({ ok: true });
  },
} satisfies AppRouteObject;
