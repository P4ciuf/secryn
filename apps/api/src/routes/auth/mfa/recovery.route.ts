import { AuthService } from "../../../core/auth/service.js";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import type { MFARecoveryBody } from "@repo/shared";
import { consumeEmailBackupCode } from "../../../utils/redis.js";
import { UserService } from "../../../modules/user/service.js";
import type { LoggedUser } from "@repo/shared";

/**
 * POST /auth/mfa/recovery
 * Completes the MFA login flow using a backup recovery code or an email-sent code.
 * Checks Redis first for email-delivered codes (10 min TTL), then falls back to
 * persisted recovery codes in the database.
 * On success, sets the auth JWT as an httpOnly cookie and invalidates the code.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/mfa/recovery",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000,
    },
  },
  schema: {
    summary: "Use recovery code to complete MFA login",
    description:
      "Completes MFA login using a backup recovery code or an email-sent code. Checks Redis for email codes first, then falls back to persisted database codes.",
    operationId: "mfaRecovery",
    tags: ["MFA"],
    body: {
      type: "object",
      required: ["code", "mfaToken"],
      properties: {
        code: {
          type: "string",
          description: "Backup recovery code (12 hex characters) or email code",
        },
        mfaToken: {
          type: "string",
          description: "Short-lived MFA token from the login response",
        },
      },
    },
    response: {
      200: {
        description: "Recovery code accepted, JWT set as cookie",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      401: { description: "Invalid recovery code or expired MFA token" },
      400: { description: "Bad request — missing fields" },
    },
  },
  handler: async (req, reply) => {
    const { code, mfaToken } = req.body as MFARecoveryBody;

    // Try email backup code in Redis first
    try {
      const payload = fastify.jwt.decode<{ email: string; userId: string; mfaPending: true }>(
        mfaToken,
      );
      if (payload && payload.email && payload.userId && payload.mfaPending) {
        const consumed = await consumeEmailBackupCode(payload.email, code);
        if (consumed) {
          const userService = await UserService.Instance(payload.userId);
          const user = await userService.getUserOrThrow({ id: payload.userId });
          const loggedUser: LoggedUser = {
            id: user.id,
            email: user.email,
            username: user.username,
          };
          const jwt = fastify.jwt.sign({ user: loggedUser }, { expiresIn: "30m" });
          reply.setCookie("auth-token", jwt, AuthService.cookieConfig);
          return reply.send({ ok: true });
        }
      }
    } catch {
      // MFA token decode failed; fall through to DB-based recovery
    }

    // Fall back to persisted DB recovery codes
    const authService = await AuthService.Instance(req);
    const jwt = await authService.recoverMFA(code, mfaToken);

    reply.setCookie("auth-token", jwt, AuthService.cookieConfig);

    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
