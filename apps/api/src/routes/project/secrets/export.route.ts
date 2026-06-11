import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { AppError } from "../../../core/errors/appError.js";
import { ProjectService } from "../../../modules/project/service.js";

type Params = {
  projectId: string;
};

/**
 * {@code GET /projects/:projectId/secrets/export}
 *
 * Exports all secrets belonging to a project in dotenv format (KEY=VALUE).
 * Requires the {@code READ_SECRETS} or {@code ALL} permission.
 * Rate-limited to 5 requests per 5 minutes.
 *
 * @param fastify - Fastify instance used to register the route
 * @returns An {@link AppRouteObject} ready for registration
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/projects/:projectId/secrets/export",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 5 * 60 * 1000, // 5 min
    },
  },
  schema: {
    summary: "Export project secrets as dotenv",
    description:
      "Exports all secrets belonging to a project in dotenv format (KEY=VALUE). The response is a downloadable .env text file. Requires READ_SECRETS or ALL permission. Rate-limited to 5 requests per 5 minutes.",
    operationId: "exportProjectSecrets",
    tags: ["Secret"],
    params: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project whose secrets will be exported",
          example: "proj_abc123",
        },
      },
    },
    response: {
      200: {
        description: "Environment file containing the project secrets",
        type: "string",
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — user lacks READ_SECRETS or ALL permission" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const params = req.params as Params;
    const envContent = await projectService.exportProjectSecrets(params.projectId);

    const project = await projectService.getProjectOrThrow({ id: params.projectId });

    const filename = `${project.slug}.env`;

    return reply
      .code(200)
      .header("Content-Type", "text/plain; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(envContent);
  },
})) satisfies AppRouteObject;
