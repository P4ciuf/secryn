import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { ProjectService } from "../../../modules/project/service.js";
import { AppError } from "../../../core/errors/appError.js";

interface UpdateProjectNameParams {
  id: string;
}

interface UpdateProjectNameBody {
  name?: string;
  description?: string;
}

/**
 * PUT /projects/:id
 *
 * Updates the name (and derived slug) and/or description of a project.
 * Only the project owner can perform the update.
 * Rate-limited to 5 requests per hour per client.
 *
 * @see ProjectService.updateProject
 */
export default ((fastify: FastifyInstance) => ({
  method: "PUT",
  url: "/projects/:id",
  config: {
    rateLimit: {
      max: 5,
      timeWindow: 60 * 60 * 1000, // 1h
    },
  },
  schema: {
    summary: "Update project",
    description:
      "Updates the name (and slug) of a project. Only the project owner can rename the project. Rate-limited to 5 requests per hour.",
    operationId: "updateProject",
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
    body: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "New project name",
        },
        description: {
          type: "string",
          description: "New project description",
        },
      },
    },
    response: {
      200: {
        description: "Project updated successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Internal project ID" },
          name: { type: "string" },
          description: { type: "string" },
          slug: { type: "string" },
          ownerId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request — missing or invalid body" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — only the project owner can update the project" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const updatedProject = await projectService.updateProject(
      {
        id: (req.params as UpdateProjectNameParams).id,
      },
      req.body as UpdateProjectNameBody,
    );

    return reply.send(updatedProject);
  },
})) satisfies AppRouteObject;
