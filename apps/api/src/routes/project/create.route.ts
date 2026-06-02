import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../types/route.js";
import { ProjectService } from "../../modules/project/service.js";
import { AppError } from "../../core/errors/appError.js";

/**
 * POST /projects
 *
 * Creates a new project owned by the authenticated user.
 * The project name must be unique among the user's projects.
 * Rate-limited to 10 requests per hour per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "POST",
  url: "/projects",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 60 * 60 * 1000, // 1h
    },
  },
  schema: {
    summary: "Create a project",
    description:
      "Creates a new project owned by the authenticated user. The project name must be unique among the user's projects. Rate-limited to 10 requests per hour.",
    operationId: "createProject",
    tags: ["Project"],
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Project name",
        },
      },
    },
    response: {
      200: {
        description: "Project created successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Internal project ID" },
          name: { type: "string" },
          slug: { type: "string" },
          ownerId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request — invalid body or project name already exists" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = new ProjectService(req.user.id);
    const project = await projectService.createProject((req.body as { name: string }).name);

    return reply.send(project);
  },
})) satisfies AppRouteObject;
