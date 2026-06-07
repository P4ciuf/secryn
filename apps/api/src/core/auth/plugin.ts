import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { AuthService } from "./service.js";

/**
 * Fastify preHandler hook that cryptographically verifies the JWT from the
 * {@code auth-token} httpOnly cookie and attaches the authenticated user to
 * {@code req.user}.
 *
 * The hook is registered as a root-level decorator so every plugin context
 * inherits it. Any route using this hook will reject forged, expired, or
 * missing tokens with a 401 response.
 *
 * @param req  - Incoming Fastify request; the cookie must contain a valid JWT.
 * @param _rep - Fastify reply object (unused, required by preHandler signature).
 * @throws {AppError} Unauthorized when the token is missing, invalid, or expired.
 * @returns A promise that resolves once {@code req.user} has been populated.
 */
export const authenticate: preHandlerHookHandler = async (
  req: FastifyRequest,
  _rep: FastifyReply,
) => {
  const authService = await AuthService.Instance(req);

  const user = await authService.verifyAndDecodeToken();
  req.user = user;
};
