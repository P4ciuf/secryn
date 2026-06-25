import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";
import { ProjectService } from "@/services/project";
import { ApiError } from "@/errors/apiError";

import { getSessionOrThrow } from "@/utils/session";
import { auth } from "@/auth";

/**
 * GET /api/projects/:id
 *
 * Returns a single project including members and secret metadata (never secret
 * values). Accessible by the project owner and any member.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 404 if the project does not exist or the requester is not a member.
 */
export const GET = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  const project = await projectService.getProject({ id });

  if (!project) throw ApiError.ResourceNotFound("Project");

  return NextResponse.json(
    {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        ownerId: project.ownerId,
        members: project.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          projectId: m.projectId,
          joinedAt: m.joinedAt.toISOString(),
        })),
        secrets: project.secrets.map((s) => ({
          id: s.id,
          name: s.name,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
    },
    { status: 200 },
  );
});

/**
 * PUT /api/projects/:id
 *
 * Updates a project's name and/or description. Only the project owner may
 * update these fields.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not the project owner.
 */
export const PUT = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const body = (await request.json()) as { name?: string; description?: string };

  const projectService = await ProjectService.Instance(user.id as string);
  const project = await projectService.updateProject({ id }, body);

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
    { status: 200 },
  );
});

/**
 * DELETE /api/projects/:id
 *
 * Permanently deletes a project and cascades to all associated secrets.
 * Only the project owner may delete the project.
 *
 * @throws 401 if the request is unauthenticated.
 * @throws 403 if the requester is not the project owner.
 */
export const DELETE = withErrorHandler(async (request, ctx: unknown) => {
  const user = await getSessionOrThrow(await auth());

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const projectService = await ProjectService.Instance(user.id as string);
  await projectService.deleteProject({ id });

  return NextResponse.json({ success: true }, { status: 200 });
});
