import type { Prisma } from "@prisma/client";
import { AppError } from "../../core/errors/appError.js";
import { UserService } from "../user/service.js";
import { projectRepository } from "./repository.js";
import { ProjectGuard } from "./guard.js";
import { generateSlugFromName } from "./utils.js";

/**
 * Business-logic layer for project operations.
 * Each instance is scoped to a single user (identified by `userId`) and
 * delegates authorization to `ProjectGuard` before mutating state via the repository.
 * The owner user is automatically added as a project member with the ALL permission.
 */
export class ProjectService {
  private readonly repository = projectRepository;
  private readonly userService = new UserService();
  private readonly guard: ProjectGuard;
  private readonly userId: string;

  /**
   * @param userId - The authenticated user on behalf of whom all operations are performed
   */
  constructor(userId: string) {
    this.userId = userId;
    this.guard = new ProjectGuard(this.repository, this.userService, userId);
  }

  /**
   * Assigns the `ALL` permission to a project member without additional authorization checks.
   * The "Unsafe" suffix indicates that the caller must have already verified that
   * the assignment is legitimate (e.g., the target user is the project owner).
   */
  private async assignAllPermissionToMemberUnsafe(memberId: string, projectId: string) {
    const user = await this.guard.getUserOrThrow(this.userId);

    await this.repository.createMemberPermissionAssignment({
      projectMember: { connect: { id: memberId, projectId } },
      permission: "ALL",
      addedByUser: { connect: { id: user.id } },
    });
  }

  /**
   * Creates a new project owned by the current user.
   * The owner is automatically added as a project member with the ALL permission.
   * The project slug is derived from the name.
   *
   * @param name - The display name of the project
   * @returns The newly created project, including owner, members, invites, and secrets
   * @throws {AppError} BadRequest — when a project with the same name or slug already exists
   */
  async createProject(name: string) {
    const user = await this.guard.getUserOrThrow(this.userId);

    const slug = generateSlugFromName(name);

    await this.guard.alreadyExistsProject({ OR: [{ slug }, { name }] });

    const project = await this.repository.createProject({
      name,
      slug,
      owner: { connect: { id: user.id } },
    });

    const ownerMember = await this.repository.createMember({
      user: { connect: { id: user.id } },
      project: { connect: { id: project.id } },
    });

    await this.assignAllPermissionToMemberUnsafe(ownerMember.id, project.id);

    return project;
  }

  /**
   * Permanently deletes a project and all associated data (secrets, members, invites).
   * Only the project owner is allowed to delete.
   *
   * @param where - Unique identifier for the project to delete
   * @throws {AppError} NotFound — when the project does not exist
   * @throws {AppError} Forbidden — when the current user is not the project owner
   */
  async deleteProject(where: Prisma.ProjectWhereUniqueInput): Promise<void> {
    const project = await this.guard.getProjectOrThrow(where);
    this.guard.validateProjectOwner(project);

    await this.repository.deleteProject(where);
  }

  /**
   * Updates the name (and derived slug) of a project.
   * Only the project owner is allowed to rename.
   *
   * @param where - Unique identifier for the project to update
   * @param name - The new project name
   * @returns The updated project with the new name and slug
   * @throws {AppError} NotFound — when the project does not exist
   * @throws {AppError} Forbidden — when the current user is not the project owner
   * @throws {AppError} BadRequest — when the new name or derived slug conflicts with an existing project
   */
  async updateNameProject(where: Prisma.ProjectWhereUniqueInput, name: string) {
    const project = await this.guard.getProjectOrThrow(where);
    this.guard.validateProjectOwner(project);

    const slug = generateSlugFromName(name);

    await this.guard.alreadyExistsProject({ OR: [{ slug }, { name: name }] });

    return await this.repository.updateProject(where, { name: name, slug });
  }

  /**
   * Transfers project ownership to another user who must already be a member.
   * The new owner receives the `ALL` permission after the transfer.
   *
   * @param where - Unique identifier for the project to transfer
   * @param toUserId - ID of the existing member who will become the new owner
   * @returns The updated project reflecting the new owner
   * @throws {AppError} NotFound — when the project or target member does not exist
   * @throws {AppError} Forbidden — when the current user is not the current project owner
   */
  async transferOwnerProject(where: Prisma.ProjectWhereUniqueInput, toUserId: string) {
    const project = await this.guard.getProjectOrThrow(where);
    this.guard.validateProjectOwner(project);

    const user = await this.guard.getUserOrThrow(toUserId);

    const member = await this.repository.findProjectMember({
      user: { id: user.id },
      project: { id: project.id },
    });
    if (!member) throw AppError.ResourceNotFound("Member");

    await this.repository.updateProject(where, {
      owner: { connect: { id: user.id } },
    });

    await this.assignAllPermissionToMemberUnsafe(member.id, project.id);

    return await this.guard.getProjectOrThrow(where);
  }

  /**
   * Retrieves a single project by unique identifier.
   * Authorization is implicit: if the user can access the project at all,
   * it is returned in full; otherwise the guard throws NotFound.
   *
   * @param where - Unique identifier for the project
   * @returns The full project including owner, members, invites, and secrets
   * @throws {AppError} NotFound — when the project does not exist
   */
  async getProject(where: Prisma.ProjectWhereUniqueInput) {
    return await this.guard.getProjectOrThrow(where);
  }
}
