import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";
import type { CreateSecretInput } from "@repo/shared";

/**
 * {@code POST /projects/:projectId/secrets}
 *
 * Creates an encrypted secret scoped to a project.
 * Requires the {@code CREATE_SECRETS} or {@code ALL} permission.
 * Rate-limited to 10 requests per 5 minutes.
 *
 * @param fastify - Fastify instance used to register the route
 * @returns An {@link AppRouteObject} ready for registration
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/projects/:projectId/secrets",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Create a secret in a project",
    description:
      "Creates a new secret in a project. The authenticated user must be a member of the project with the CREATE_SECRETS or ALL permission. Rate-limited to 10 requests per 5 minutes.",
    operationId: "createSecret",
    tags: ["Secret"],
    params: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: { type: "string", description: "The project ID" },
      },
    },
    body: {
      type: "object",
      required: ["name", "value", "notes"],
      properties: {
        name: { type: "string", description: "The name of the secret", example: "DATABASE_URL" },
        value: {
          type: "string",
          description: "The value of the secret",
          example: "postgresql://user:pass@localhost:5432/mydb",
        },
        notes: {
          type: "string",
          description: "The notes of the secret",
          example: "Production database connection string",
        },
      },
    },
    response: {
      201: {
        description: "Secret created successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Unique secret identifier" },
          name: { type: "string" },
          value: { type: "string" },
          notes: { type: "string" },
          projectId: { type: "string" },
          addedById: { type: "string" },
          updatedById: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request — missing or invalid body" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — user lacks CREATE_SECRETS or ALL permission" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const params = req.params as { projectId: string };
    const body = req.body as CreateSecretInput;
    const secret = await projectService.createSecret(params.projectId, body);

    return reply.code(201).send(secret);
  },
})) satisfies AppRouteObject;
