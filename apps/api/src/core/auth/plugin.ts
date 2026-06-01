import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./service.js";

/**
 * Fastify plugin that decorates the instance with an `authenticate` preHandler hook.
 * Decodes the JWT from the request cookie and attaches the user payload to `req.user`.
 *
 * @param fastify - The Fastify instance to decorate
 */
export default async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async function (req: FastifyRequest, _rep: FastifyReply) {
    const authService = new AuthService(req);
    req.user = authService.decodeToken();
  });
}
