import type { User } from "@prisma/client";
import "fastify";

/** Minimal user data embedded in the JWT payload for authenticated requests. */
export type LoggedUser = Pick<User, "id" | "email" | "username">;

/**
 * Augments Fastify's request type so that `req.user` is available
 * after JWT verification without manual casting.
 */
declare module "fastify" {
  interface FastifyRequest {
    user?: LoggedUser;
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
