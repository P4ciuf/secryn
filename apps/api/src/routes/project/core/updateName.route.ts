import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../../../types/route.js";
import { ProjectService } from "../../../modules/project/service.js";
import { AppError } from "../../../core/errors/appError.js";

/**
 * PUT /projects/:id
 *
 * Updates the display name (and derived slug) of a project.
 * Only the project owner can rename the project.
 * Rate-limited to 5 requests per hour per client.
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
    summary: "Update project name",
    description:
      "Updates the name (and slug) of a project. Only the project owner can rename the project. Rate-limited to 5 requests per hour.",
    operationId: "updateProjectName",
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
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "New project name",
        },
      },
    },
    response: {
      200: {
        description: "Project name updated successfully",
        type: "object",
        properties: {
          id: { type: "string", description: "Project ID" },
          name: { type: "string" },
          slug: { type: "string" },
          ownerId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      400: { description: "Bad request — invalid body or project name/slug already exists" },
      401: { description: "Unauthorized — missing or invalid JWT" },
      403: { description: "Forbidden — only the project owner can rename the project" },
      404: { description: "Not found — project does not exist" },
      500: { description: "Internal server error" },
    },
    security: [{ cookieAuth: [] }],
  },
  preHandler: [fastify.authenticate],
  handler: async (req, reply) => {
    if (!req.user) throw AppError.Unauthorized("Not logged in");

    const projectService = await ProjectService.Instance(req.user.id);
    const updatedProject = await projectService.updateNameProject(
      {
        id: (req.params as { id: string }).id,
      },
      (req.body as { name: string }).name,
    );

    return reply.send(updatedProject);
  },
})) satisfies AppRouteObject;
