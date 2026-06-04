import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { ProjectService } from "../../../modules/project/service.js";
import { AppError } from "../../../core/errors/appError.js";
import { logger } from "../../../core/logger/index.js";

interface GetProjectParams {
  id: string;
}

/**
 * GET /projects/:id
 *
 * Retrieves a single project by its ID.
 * The project must be owned by or shared with the authenticated user.
 * Rate-limited to 10 requests per 15-minute window per client.
 */
export default ((fastify: FastifyInstance) => ({
  method: "GET",
  url: "/projects/:id",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: 15 * 60 * 1000, // 15 min
    },
  },
  schema: {
    summary: "Get a project by ID",
    description:
      "Retrieves a single project owned by or shared with the authenticated user. Returns the full project including owner, members, invites, and secrets.",
    operationId: "getProject",
    tags: ["Project"],
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "The project id",
        },
      },
    },
    response: {
      200: {
        description: "Project details, or a list of all user projects when id is '@all'",
        oneOf: [
          {
            type: "object",
            description: "Single project",
            properties: {
              id: { type: "string", description: "Internal project ID" },
              name: { type: "string" },
              description: { type: "string" },
              slug: { type: "string" },
              ownerId: { type: "string" },
              owner: { type: "object", description: "Owner user object" },
              members: { type: "array", description: "Project members" },
              projectInvites: { type: "array", description: "Active project invites" },
              secrets: { type: "array", description: "Project secrets" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          {
            type: "array",
            description: "List of all projects for the authenticated user",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                slug: { type: "string" },
                ownerId: { type: "string" },
                owner: { type: "object" },
                members: { type: "array" },
                projectInvites: { type: "array" },
                secrets: { type: "array" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        ],
      },
      400: { description: "Bad request" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");
    const params = req.params as GetProjectParams;

    const projectService = await ProjectService.Instance(req.user.id);

    if (params.id === "@all") {
      const projects = await projectService.getUserProjects();
      logger.debug("[GetProjectRoute] Projects: " + JSON.stringify(projects));
      return reply.code(200).send(projects);
    }

    const project = await projectService.getProjectOrThrow({ id: params.id });
    return reply.code(200).send(project);
  },
})) satisfies AppRouteObject;
