import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { getAuthenticatedUser } from "@/utils/authGuard";
import { ProjectService } from "@/services/project";
import { ApiError } from "@/errors/apiError";
import type { CreateProjectInput } from "@repo/shared";

/**
 * GET /api/projects
 *
 * Lists all projects the authenticated user owns or is a member of.
 * Secrets are never included in the list response.
 *
 * @throws 401 if the request is unauthenticated.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) throw ApiError.Unauthorized();

  const projectService = await ProjectService.Instance(user.id);
  const projects = await projectService.getUserProjects();

  return NextResponse.json(
    {
      success: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        ownerId: p.ownerId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
    { status: 200 },
  );
});

/**
 * POST /api/projects
 *
 * Creates a new project. The authenticated user becomes the project owner.
 * A unique slug is generated from the project name.
 *
 * @throws 400 if `name` is missing.
 * @throws 401 if the request is unauthenticated.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request);
  if (!user) throw ApiError.Unauthorized();

  const body = (await request.json()) as CreateProjectInput;

  if (!body.name) {
    return NextResponse.json(
      {
        success: false,
        message: "Project name is required.",
        code: "BAD_REQUEST",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const projectService = await ProjectService.Instance(user.id);
  const project = await projectService.createProject(body.name, body.description ?? "");

  return NextResponse.json(
    {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        ownerId: project.ownerId,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
});
