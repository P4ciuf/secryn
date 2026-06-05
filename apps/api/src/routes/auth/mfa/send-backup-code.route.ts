import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { UserService } from "../../../modules/user/service.js";
import { AppError } from "../../../core/errors/appError.js";
import { randomBytes } from "node:crypto";
import { storeEmailBackupCode } from "../../../utils/redis.js";

/**
 * POST /auth/mfa/send-backup-code
 * Generates a single backup code, stores it in Redis with a 10-minute TTL,
 * and sends it to the user's email address.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/auth/mfa/send-backup-code",
  config: {
    rateLimit: {
      max: 3,
      timeWindow: 10 * 60 * 1000,
    },
  },
  schema: {
    summary: "Send a backup code via email",
    description:
      "Generates a temporary backup code, stores it in Redis (10 min TTL), and sends it to the user's email address.",
    operationId: "mfaSendBackupCode",
    tags: ["MFA"],
    body: {
      type: "object",
      required: ["mfaToken"],
      properties: {
        mfaToken: {
          type: "string",
          description: "Short-lived MFA token from the login response",
        },
      },
    },
    response: {
      200: {
        description: "Backup code sent via email",
        type: "object",
        properties: {
          ok: { type: "boolean", example: true },
        },
      },
      400: { description: "Bad request" },
      401: { description: "Invalid MFA token" },
    },
  },
  handler: async (req, reply) => {
    const { mfaToken } = req.body as { mfaToken: string };

    let payload: { userId: string; mfaPending: true; email: string };
    try {
      payload = fastify.jwt.verify<{ userId: string; mfaPending: true; email: string }>(mfaToken);
    } catch {
      throw AppError.Unauthorized("Invalid or expired MFA token");
    }

    const userService = await UserService.Instance(payload.userId);
    const code = randomBytes(6).toString("hex");

    await storeEmailBackupCode(payload.email, code);
    await userService.sendBackupCodeEmail(code);

    return reply.send({ ok: true });
  },
})) satisfies AppRouteObject;
