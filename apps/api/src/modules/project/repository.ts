import { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma.js";

/**
 * Project entity with all top-level relations included (owner, members, invites, secrets).
 * Used as the standard return type for every repository method so callers always
 * have a consistent shape without needing to specify `.include` each time.
 */
export type FullProject = Prisma.ProjectGetPayload<{
  include: {
    owner: true;
    members: true;
    projectInvites: true;
    secrets: true;
  };
}>;

/**
 * Data-access layer for the Project aggregate.
 * Every method that returns a project uses a fixed `.include` set so that
 * consumers always receive the same relational shape (see FullProject).
 * The owner, while stored as a foreign-key reference (ownerId), is always
 * eagerly loaded alongside members, invites, and secrets.
 */
export class ProjectRepository {
  /** Shared inclusion set applied to every project query for consistency. */
  private readonly projectInclude = {
    owner: true,
    members: true,
    projectInvites: true,
    secrets: true,
  };

  async createProject(data: Prisma.ProjectCreateInput): Promise<FullProject> {
    return await prisma.project.create({ data, include: this.projectInclude });
  }

  async findProject(where: Prisma.ProjectWhereInput): Promise<FullProject | null> {
    return await prisma.project.findFirst({ where, include: this.projectInclude });
  }

  async findProjects(where: Prisma.ProjectWhereInput): Promise<FullProject[]> {
    return await prisma.project.findMany({ where, include: this.projectInclude });
  }

  async updateProject(
    where: Prisma.ProjectWhereUniqueInput,
    data: Prisma.ProjectUpdateInput,
  ): Promise<FullProject> {
    return await prisma.project.update({ where, data, include: this.projectInclude });
  }

  async deleteProject(where: Prisma.ProjectWhereUniqueInput): Promise<FullProject> {
    return await prisma.project.delete({ where, include: this.projectInclude });
  }

  async findAllProjects(where?: Prisma.ProjectWhereInput): Promise<FullProject[]> {
    return await prisma.project.findMany({ where, include: this.projectInclude });
  }

  async createMember(data: Prisma.ProjectMemberCreateInput) {
    return await prisma.projectMember.create({ data });
  }

  async findProjectMember(where: Prisma.ProjectMemberWhereInput) {
    return await prisma.projectMember.findFirst({ where });
  }

  async deleteProjectMember(where: Prisma.ProjectMemberWhereUniqueInput) {
    return await prisma.projectMember.delete({ where });
  }

  async updateProjectMember(
    where: Prisma.ProjectMemberWhereUniqueInput,
    data: Prisma.ProjectMemberUpdateInput,
  ) {
    return await prisma.projectMember.update({ where, data });
  }

  async createInvite(data: Prisma.ProjectInviteCreateInput) {
    return await prisma.projectInvite.create({ data });
  }

  async findProjectInvite(where: Prisma.ProjectInviteWhereInput) {
    return await prisma.projectInvite.findFirst({ where });
  }

  async deleteProjectInvite(where: Prisma.ProjectInviteWhereUniqueInput) {
    return await prisma.projectInvite.delete({ where });
  }

  async updateProjectInvite(
    where: Prisma.ProjectInviteWhereUniqueInput,
    data: Prisma.ProjectInviteUpdateInput,
  ) {
    return await prisma.projectInvite.update({ where, data });
  }

  async createMemberPermissionAssignment(
    data: Prisma.ProjectMemberPermissionAssignmentCreateInput,
  ) {
    return await prisma.projectMemberPermissionAssignment.create({ data });
  }

  async findProjectMemberPermissionAssignment(
    where: Prisma.ProjectMemberPermissionAssignmentWhereInput,
  ) {
    // A member can hold multiple permissions; findMany returns the full assignment list.
    return await prisma.projectMemberPermissionAssignment.findMany({ where });
  }

  async deleteProjectMemberPermissionAssignment(
    where: Prisma.ProjectMemberPermissionAssignmentWhereInput,
  ) {
    // Prisma's delete method requires a unique input type, but the caller
    // supplies a composite `where` object that uniquely identifies the row.
    return await prisma.projectMemberPermissionAssignment.delete({
      where: where as Prisma.ProjectMemberPermissionAssignmentWhereUniqueInput,
    });
  }

  async updateProjectMemberPermissionAssignment(
    where: Prisma.ProjectMemberPermissionAssignmentWhereUniqueInput,
    data: Prisma.ProjectMemberPermissionAssignmentUpdateInput,
  ) {
    return await prisma.projectMemberPermissionAssignment.update({ where, data });
  }

  async createSecret(data: Prisma.SecretCreateInput) {
    return await prisma.secret.create({ data });
  }

  async findSecret(where: Prisma.SecretWhereInput) {
    return await prisma.secret.findFirst({ where });
  }

  async deleteSecret(where: Prisma.SecretWhereUniqueInput) {
    return await prisma.secret.delete({ where });
  }

  async updateSecret(where: Prisma.SecretWhereUniqueInput, data: Prisma.SecretUpdateInput) {
    return await prisma.secret.update({ where, data });
  }

  async findManySecrets(where: Prisma.SecretWhereInput) {
    return await prisma.secret.findMany({ where });
  }
}

/** Singleton repository instance used throughout the application. */
export const projectRepository = new ProjectRepository();
