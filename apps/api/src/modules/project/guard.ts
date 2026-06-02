import type { Prisma } from "@prisma/client";
import { AppError } from "../../core/errors/appError.js";
import type { FullUser } from "../user/repository.js";
import { UserService } from "../user/service.js";
import type { FullProject, ProjectRepository } from "./repository.js";

/**
 * Authorization guard for project-level operations.
 * Centralises ownership validation and existence checks so that route handlers
 * and services remain free of cross-cutting access-control logic.
 */
export class ProjectGuard {
  constructor(
    private repository: ProjectRepository,
    private userService: UserService,
    private userId: string,
  ) {}

  /**
   * Retrieves a project by an arbitrary filter or throws when none is found.
   *
   * @param where - Prisma filter predicate used to locate the project
   * @returns The full project including relations
   * @throws {AppError} ResourceNotFound — when no project matches the filter
   */
  async getProjectOrThrow(where: Prisma.ProjectWhereInput): Promise<FullProject> {
    const project = await this.repository.findProject(where);
    if (!project) throw AppError.ResourceNotFound("Project");
    return project;
  }

  /**
   * Checks whether a project matching the given filter already exists and throws
   * if one is found. Used to enforce uniqueness constraints before creation.
   *
   * @param where - Prisma filter predicate to test for existence
   * @throws {AppError} BadRequest — when a matching project already exists
   */
  async alreadyExistsProject(where: Prisma.ProjectWhereInput) {
    const project = await this.repository.findProject(where);
    if (project) throw AppError.BadRequest("Project already exists");
  }

  /**
   * Resolves a user by ID or throws. The `isOwner` flag changes the error
   * message from "User" to "Owner" for clarity in ownership-specific contexts.
   *
   * @param id - The user ID to look up
   * @param isOwner - Whether the user is expected to be the project owner (affects error message)
   * @returns The full user record
   * @throws {AppError} ResourceNotFound — when the user does not exist
   */
  async getUserOrThrow(id: string, isOwner = false): Promise<FullUser> {
    const user = await this.userService.getUser({ id });
    if (!user) throw AppError.ResourceNotFound(isOwner ? "Owner" : "User");
    return user;
  }

  /**
   * Asserts that the currently authenticated user (identified by `this.userId`)
   * is the owner of the given project.
   *
   * @param project - The project whose owner is compared against the current user
   * @throws {AppError} Forbidden — when the current user is not the project owner
   */
  validateProjectOwner(project: FullProject): void {
    if (project.owner.id !== this.userId) {
      throw AppError.Forbidden("You are not authorized to perform this action");
    }
  }
}
