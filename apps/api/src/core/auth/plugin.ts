import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { AuthService } from "./service.js";

/**
 * Verifies JWT from the request cookie and attaches the decoded user to `req.user`.
 * Registered as a root-level Fastify decorator so it is inherited by all plugin contexts.
 */
export const authenticate: preHandlerHookHandler = async (
  req: FastifyRequest,
  _rep: FastifyReply,
) => {
  const authService = await AuthService.Instance(req);

  const user = await authService.decodeToken();
  req.user = user;
};
