import { AuthService } from "../../core/auth/service.js";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";

/** Shape of the request body expected by the login endpoint. */
type LoginBody = {
  email: string;
  password: string;
};

/**
 * POST /auth/login
 * Authenticates a user with email and password. Sets the JWT as an httpOnly cookie.
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
      "Authenticates a user with email and password. Sets the JWT as an httpOnly cookie on success. Rate-limited to 5 attempts per hour.",
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
        },
      },
    },
    response: {
      200: {
        description: "Login successful, JWT set as cookie",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
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
    const authService = new AuthService(req);
    // Cast is safe: the AJV schema defined above guarantees email and password exist
    const token = await authService.login(req.body as LoginBody);

    reply.setCookie("auth-token", token, AuthService.cookieConfig);

    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
