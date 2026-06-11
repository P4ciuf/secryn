import "fastify";
import type { ApiKey, LoggedUser } from "@repo/shared";
export type { LoggedUser };

/**
 * Augments Fastify's request type so that `req.user` is available
 * after JWT verification without manual casting.
 */
declare module "fastify" {
  interface FastifyRequest {
    user?: LoggedUser;
    apiKey?: ApiKey;
  }
  interface FastifyInstance {
    authenticate: import("fastify").preHandlerHookHandler;
  }
}

/**
 * Augments @fastify/jwt so that decoded and verified tokens are typed
 * as LoggedUser, matching the payload shape signed in AuthService.generateToken.
 */
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: LoggedUser;
  }
}
