import type { User } from "@prisma/client";
import "fastify";

/** Minimal user data embedded in the JWT payload for authenticated requests. */
export type LoggedUser = Pick<User, "uuid" | "email" | "username">;

/**
 * Augments Fastify's request type so that `req.user` is available
 * after JWT verification without manual casting.
 */
declare module "fastify" {
  interface FastifyRequest {
    user?: LoggedUser;
  }
}
