import type { RegisterBody } from "@repo/shared";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";
import { AuthService } from "../../core/auth/service.js";

/**
 * POST /auth/register
 * Creates a new user account and sets the JWT as an httpOnly cookie.
 * Rate-limited to 2 requests per 30 minutes per client to mitigate account creation abuse.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/register",
  config: {
    rateLimit: {
      max: 2,
      timeWindow: 30 * 60 * 1000, // 30m
    },
  },
  schema: {
    summary: "Register a new user",
    description:
      "Creates a new user account with email and password. Optionally accepts a username. Sets the JWT as an httpOnly cookie on success. Rate-limited to 2 attempts per 30 minutes.",
    operationId: "authRegister",
    tags: ["Auth"],
    body: {
      type: "object",
      required: ["email", "password"],
      properties: {
        username: {
          type: "string",
          description: "Display name; auto-generated from random hex when omitted",
        },
        email: {
          type: "string",
          description: "User email address",
        },
        password: {
          type: "string",
          description: "Password (min. 8 characters recommended)",
        },
      },
    },
    response: {
      200: {
        description: "Registration successful, JWT set as cookie",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      400: { description: "Bad request — missing or invalid fields" },
      409: { description: "Conflict — email or username already registered" },
      500: { description: "Internal server error" },
    },
  },
  handler: async (req, reply) => {
    // Cast is safe: the AJV schema defined above guarantees email and password exist
    const { username, email, password } = req.body as RegisterBody;
    const authService = await AuthService.Instance(req);
    const token = await authService.register({ username, email, password });

    reply.setCookie("auth-token", token, AuthService.cookieConfig);

    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
