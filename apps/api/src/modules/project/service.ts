import { ProjectMemberPermission, type Prisma } from "@prisma/client";
import { AppError } from "../../core/errors/appError.js";
import { UserService } from "../user/service.js";
import { projectRepository, type FullProject } from "./repository.js";
import { EmailUtils } from "../../utils/email.js";
import { EnvUtils } from "../../utils/env.js";
import { PolicyProject } from "./policy.js";
import { generateInvitationExpiryDate, generateSlugFromName, ownsProject } from "./helper.js";
import type { FullUser } from "../user/repository.js";
import path from "node:path";
import { readFileSync } from "node:fs";

/**
 * Business-logic layer for project operations.
 * Each instance is scoped to a single authenticated user and delegates
 * authorization to {@link PolicyProject} before mutating state via the repository.
 */
export class ProjectService {
  private readonly repository = projectRepository;
  private readonly userService = new UserService();
  private readonly policy = PolicyProject;
  private readonly user: FullUser;

  /**
   * @param userId - The authenticated user on behalf of whom all operations are performed
   */
  private constructor(user: FullUser) {
    this.user = user;
  }

  /**
   * Async factory that resolves the authenticated user and constructs a scoped instance.
   * Must be used instead of the private constructor — it fetches the full user record
   * required for authorization checks throughout the service.
   *
   * @async
   * @param userId - The authenticated user's ID
   * @returns A ProjectService instance bound to the resolved user
   * @throws {AppError} ResourceNotFound — when the user does not exist
   */
  static async Instance(userId: string): Promise<ProjectService> {
    const userService = new UserService();
    const user = await userService.getUserOrThrow({ id: userId });
    const instance = new ProjectService(user);
    return instance;
  }

  /**
   * Assigns the `ALL` permission to a project member without additional authorization checks.
   * The "Unsafe" suffix indicates that the caller must have already verified that
   * the assignment is legitimate (e.g., the target user is the project owner).
   */
  private async assignAllPermissionToMemberUnsafe(memberId: string, projectId: string) {
    await this.repository.createMemberPermissionAssignment({
      projectMember: { connect: { id: memberId, projectId } },
      permission: "ALL",
      addedByUser: { connect: { id: this.user.id } },
    });
  }

  /**
   * Checks whether a project matching the given criteria already exists.
   * Throws {@link AppError.BadRequest} if a match is found — no return value on success.
   *
   * @param where - Search criteria to check for an existing project
   * @throws {AppError} BadRequest — when a matching project already exists
   */
  private async alreadyExistsProject(where: Prisma.ProjectWhereInput) {
    const project = await this.repository.findProject(where);
    if (project) throw AppError.BadRequest("Project already exists");
  }

  /**
   * Creates a new project owned by the current user.
   * The owner is automatically added as a project member with the ALL permission.
   * The project slug is derived from the name.
   *
   * @async
   * @param name - The display name of the project
   * @returns The newly created project, including owner, members, invites, and secrets
   * @throws {AppError} BadRequest — when a project with the same name or slug already exists
   */
  async createProject(name: string) {
    const slug = generateSlugFromName(name);

    await this.alreadyExistsProject({ OR: [{ slug }, { name }] });

    const project = await this.repository.createProject({
      name,
      slug,
      owner: { connect: { id: this.user.id } },
    });

    const ownMember = await this.repository.createMember({
      user: { connect: { id: this.user.id } },
      project: { connect: { id: project.id } },
    });

    await this.assignAllPermissionToMemberUnsafe(ownMember.id, project.id);

    return project;
  }

  /**
   * Permanently deletes a project and all associated data (secrets, members, invites).
   * Only the project owner is allowed to delete.
   *
   * @async
   * @param where - Unique identifier for the project to delete
   * @throws {AppError} NotFound — when the project does not exist
   * @throws {AppError} Forbidden — when the current user is not the project owner
   */
  async deleteProject(where: Prisma.ProjectWhereUniqueInput): Promise<void> {
    const project = await this.getProjectOrThrow(where);
    ownsProject(this.user.id, project.owner.id);

    await this.repository.deleteProject(where);
  }

  /**
   * Updates the name (and derived slug) of a project.
   * Only the project owner is allowed to rename.
   *
   * @async
   * @param where - Unique identifier for the project to update
   * @param name - The new project name
   * @returns The updated project with the new name and slug
   * @throws {AppError} NotFound — when the project does not exist
   * @throws {AppError} Forbidden — when the current user is not the project owner
   * @throws {AppError} BadRequest — when the new name or derived slug conflicts with an existing project
   */
  async updateNameProject(where: Prisma.ProjectWhereUniqueInput, name: string) {
    const project = await this.getProjectOrThrow(where);
    ownsProject(this.user.id, project.owner.id);

    const slug = generateSlugFromName(name);

    await this.alreadyExistsProject({ OR: [{ slug }, { name: name }] });

    return await this.repository.updateProject(where, { name: name, slug });
  }

  /**
   * Transfers project ownership to another user who must already be a member.
   * The new owner receives the `ALL` permission after the transfer.
   *
   * @async
   * @param where - Unique identifier for the project to transfer
   * @param toUserId - ID of the existing member who will become the new owner
   * @returns The updated project reflecting the new owner
   * @throws {AppError} NotFound — when the project or target member does not exist
   * @throws {AppError} Forbidden — when the current user is not the current project owner
   */
  async transferOwnerProject(where: Prisma.ProjectWhereUniqueInput, toUserId: string) {
    const project = await this.getProjectOrThrow(where);
    ownsProject(this.user.id, project.owner.id);

    const user = await this.userService.getUserOrThrow({ id: toUserId });

    const member = await this.getMemberOrThrow({
      user: { id: user.id },
      project: { id: project.id },
    });

    await this.repository.updateProject(where, {
      owner: { connect: { id: user.id } },
    });

    await this.assignAllPermissionToMemberUnsafe(member.id, project.id);

    return await this.getProjectOrThrow(where);
  }

  /**
   * Retrieves a single project by unique identifier.
   * Authorization is implicit: if the user can access the project at all,
   * it is returned in full; otherwise the guard throws NotFound.
   *
   * @async
   * @param where - Unique identifier for the project
   * @returns The full project including owner, members, invites, and secrets
   * @throws {AppError} NotFound — when the project does not exist
   */
  async getProject(where: Prisma.ProjectWhereUniqueInput) {
    return await this.repository.findProject(where);
  }

  async getProjectOrThrow(where: Prisma.ProjectWhereUniqueInput): Promise<FullProject> {
    const project = await this.repository.findProject(where);
    if (!project) throw AppError.ResourceNotFound("Project");
    return project;
  }

  /**
   * Creates an invitation for a registered user to join a project.
   * The inviter must hold the `ALL` or `CREATE_INVITES` permission in the target project.
   * Invites expire 7 calendar days after creation. If the invitee is already a member, the request
   * is rejected. On success, a styled HTML invitation email is dispatched to the invitee via Resend.
   *
   * @async
   * @param toEmail - Email of the registered user to invite
   * @param projectId - ID of the project the user is being invited to
   * @throws {AppError} ResourceNotFound — when the invitee or the inviter's membership is not found
   * @throws {AppError} Forbidden — when the inviter lacks the required permission
   * @throws {AppError} BadRequest — when the invited user is already a project member
   */
  async createInvite(toEmail: string, projectId: string) {
    const toUser = await new UserService().getUser({ email: toEmail });

    if (!toUser) {
      throw AppError.ResourceNotFound("User not found");
    }

    const project = await this.getProjectOrThrow({ id: projectId });

    const fromMember = await this.getMemberOrThrow({
      user: { id: this.user.id },
      project: { id: project.id },
    });

    const fromMemberPermission = await this.repository.findProjectMemberPermissionAssignment({
      projectMember: { id: fromMember.id },
    });

    if (!fromMemberPermission) throw Error("Member permission not found");
    if (!this.policy.hasPermission(fromMemberPermission, ProjectMemberPermission.CREATE_INVITES)) {
      throw AppError.Forbidden("You don't have permission to create invites");
    }

    const existsUserMember = await this.getMember({
      user: { id: toUser.id },
      project: { id: project.id },
    });
    if (existsUserMember) throw AppError.BadRequest("User is already a member of this project");

    const expiresAt = generateInvitationExpiryDate();

    const invite = await this.repository.createInvite({
      project: { connect: { id: projectId } },
      slug: generateSlugFromName(toUser.email + project.id),
      expiresAt,
    });

    const template = readFileSync(path.join(__dirname, "emails/project-invitation.html"), "utf-8");

    const emailHTMLContent = template
      .replace("{{EMAIL}}", toUser.email)
      .replace("{{INVITE_URL}}", `${EnvUtils.envVariables().appUrl}/join/${invite.slug}`)
      .replace("{{YEAR}}", String(new Date().getFullYear()));

    await new EmailUtils().sendEmail(toUser.email, "Invitation to join project", emailHTMLContent);
  }

  async getMember(where: Prisma.ProjectMemberWhereInput) {
    return await this.repository.findProjectMember(where);
  }

  async getMemberOrThrow(where: Prisma.ProjectMemberWhereInput) {
    const member = await this.getMember(where);
    if (!member) throw AppError.ResourceNotFound("Member");
    return member;
  }

  async getInviteOrThrow(where: Prisma.ProjectInviteWhereUniqueInput) {
    const invite = await this.repository.findProjectInvite(where);
    if (!invite) throw AppError.ResourceNotFound("Invite");
    return invite;
  }

  /**
   * Accepts a project invitation identified by its slug, adding the authenticated user
   * as a project member and consuming the invite so it cannot be reused.
   *
   * @async
   * @param slug - The unique invitation slug from the invite link
   * @throws {AppError} ResourceNotFound — when the invite does not exist
   * @throws {AppError} BadRequest — when the invite has expired or the user is already a member
   */
  async acceptInvite(slug: string): Promise<void> {
    const invite = await this.getInviteOrThrow({ slug });

    if (invite.expiresAt < new Date()) throw AppError.BadRequest("Invite has expired");

    const existsUserMember = await this.getMember({
      user: { id: this.user.id },
      project: { id: invite.projectId },
    });
    if (existsUserMember) throw AppError.BadRequest("User is already a member of this project");

    await this.repository.createMember({
      user: { connect: { id: this.user.id } },
      project: { connect: { id: invite.projectId } },
    });

    await this.repository.deleteProjectInvite({
      slug_projectId: { slug, projectId: invite.projectId },
    });
  }

  /**
   * Removes a member from a project. The caller must hold the `ALL` or `REMOVE_MEMBERS`
   * permission in the target project. A user cannot remove themselves from a project.
   *
   * @async
   * @param memberId - ID of the project member to remove
   * @param projectId - ID of the project the member belongs to
   * @throws {AppError} ResourceNotFound — when the project, the caller's user record,
   *   or the target member does not exist
   * @throws {AppError} Forbidden — when the caller lacks ALL or REMOVE_MEMBERS permission
   * @throws {AppError} BadRequest — when the caller attempts to remove themselves
   */
  async removeMemberToProject(memberId: string, projectId: string): Promise<void> {
    const project = await this.getProjectOrThrow({ id: projectId });
    const member = await this.getMemberOrThrow({ id: memberId });

    const memberPermission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: member.id },
    });

    if (!this.policy.hasPermission(memberPermission, ProjectMemberPermission.REMOVE_MEMBERS)) {
      throw AppError.Forbidden("You don't have permission to remove members");
    }

    if (member.userId === this.user.id) throw AppError.BadRequest("You cannot remove yourself");

    await this.repository.deleteProjectMember({ id: member.id, projectId: project.id });
  }

  /**
   * Grants one or more permissions to a project member.
   * The caller must hold the `ALL` or `MANAGE_MEMBERS` permission in the target project.
   *
   * @async
   * @param memberId - ID of the project member receiving the permissions
   * @param projectId - Project in which the permissions are granted
   * @param permissions - Set of `ProjectMemberPermission` values to assign
   * @throws {AppError} ResourceNotFound — when the member, the caller's membership,
   *   or the permission assignment is not found
   * @throws {AppError} Forbidden — when the caller lacks MANAGE_MEMBERS or ALL permission
   */
  async addPermissionsToMember(
    memberId: string,
    projectId: string,
    permissions: Array<ProjectMemberPermission>,
  ) {
    const member = await this.getMemberOrThrow({ id: memberId });
    const adminMember = await this.getMemberOrThrow({
      user: { id: this.user.id },
      project: { id: projectId },
    });

    const adminPermission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: adminMember.id },
    });

    if (!this.policy.hasPermission(adminPermission, ProjectMemberPermission.MANAGE_MEMBERS)) {
      throw AppError.Forbidden("You don't have permission to add permissions");
    }

    for (const permission of permissions) {
      await this.repository.createMemberPermissionAssignment({
        permission: permission,
        projectMember: { connect: { id: member.id } },
        addedByUser: { connect: { id: this.user.id } },
      });
    }
  }

  /**
   * Revokes one or more permissions from a project member.
   * The caller must hold the `ALL` or `MANAGE_MEMBERS` permission in the target project.
   *
   * @async
   * @param memberId - ID of the project member whose permissions are being revoked
   * @param projectId - Project the member belongs to
   * @param permissions - Set of `ProjectMemberPermission` values to revoke
   * @throws {AppError} ResourceNotFound — when the member, the caller's membership,
   *   or the permission assignment is not found
   * @throws {AppError} Forbidden — when the caller lacks MANAGE_MEMBERS or ALL permission
   */
  async removePermissionsFromMember(
    memberId: string,
    projectId: string,
    permissions: Array<ProjectMemberPermission>,
  ) {
    const member = await this.getMemberOrThrow({ id: memberId });
    const adminMember = await this.getMemberOrThrow({
      user: { id: this.user.id },
      project: { id: projectId },
    });

    const adminPermission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: adminMember.id },
    });

    if (!this.policy.hasPermission(adminPermission, ProjectMemberPermission.MANAGE_MEMBERS)) {
      throw AppError.Forbidden("You don't have permission to remove permissions");
    }

    for (const permission of permissions) {
      await this.repository.deleteProjectMemberPermissionAssignment({
        permission: permission,
        projectMember: { id: member.id },
      });
    }
  }

  async getPermissionAssignment(where: Prisma.ProjectMemberPermissionAssignmentWhereInput) {
    return await this.repository.findProjectMemberPermissionAssignment(where);
  }

  async getPermissionAssignmentOrThrow(where: Prisma.ProjectMemberPermissionAssignmentWhereInput) {
    const permissionAssignment = await this.getPermissionAssignment(where);
    if (!permissionAssignment) throw AppError.ResourceNotFound("Permission assignment");
    return permissionAssignment;
  }
}
