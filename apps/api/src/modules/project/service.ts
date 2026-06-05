import { ProjectMemberPermission, type Prisma } from "@prisma/client";
import { AppError } from "../../core/errors/appError.js";
import { UserService } from "../user/service.js";
import { projectRepository, type FullProject } from "./repository.js";
import { EmailUtils } from "../../utils/email.js";
import { EnvUtils } from "../../utils/env.js";
import { PolicyProject } from "./policy.js";
import { generateInvitationExpiryDate, generateSlugFromName, ownsProject } from "./helper.js";
import type { FullUser } from "../user/repository.js";
import { readFileSync } from "node:fs";
import { logger } from "../../core/logger/index.js";
import { CryptoUtils } from "../../utils/crypto.js";

/**
 * Business-logic layer for project operations.
 * Each instance is scoped to a single authenticated user and delegates
 * authorization to {@link PolicyProject} before mutating state via the repository.
 */
export class ProjectService {
  private readonly repository = projectRepository;
  private readonly policy = PolicyProject;
  private readonly user: FullUser;

  /**
   * @param user - The full authenticated user record on behalf of whom all operations are performed
   */
  private constructor(
    user: FullUser,
    private readonly userService: UserService,
  ) {
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
    const userService = await UserService.Instance(userId);
    const user = await userService.getUserOrThrow({ id: userId });
    return new ProjectService(user, userService);
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
      addedByUser: { connect: { id: memberId } },
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
   * @param desc - The project description (can be empty)
   * @returns The newly created project, including owner, members, invites, and secrets
   * @throws {AppError} BadRequest — when a project with the same name or slug already exists
   */
  async createProject(name: string, desc: string) {
    const slug = generateSlugFromName(name);

    await this.alreadyExistsProject({ OR: [{ slug }, { name }] });

    const project = await this.repository.createProject({
      name,
      description: desc,
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
   * Updates the name (and derived slug) and/or description of a project.
   * Only the project owner is allowed to rename.
   * When the name changes, the slug is regenerated and checked for uniqueness.
   * Omitted fields retain their current values.
   *
   * @async
   * @param where - Unique identifier for the project to update
   * @param data - Partial project fields to update ({name?, description?})
   * @param data.name - When provided and different from the current name, regenerates the slug
   * @param data.description - When omitted, the existing description is preserved
   * @returns The updated project with the new name, slug, and description
   * @throws {AppError} NotFound — when the project does not exist
   * @throws {AppError} Forbidden — when the current user is not the project owner
   * @throws {AppError} BadRequest — when the new name or derived slug conflicts with an existing project
   */
  async updateProject(
    where: Prisma.ProjectWhereUniqueInput,
    data: { name?: string; description?: string },
  ) {
    const project = await this.getProjectOrThrow(where);
    ownsProject(this.user.id, project.owner.id);

    const { name, description } = data;
    let slug = project.slug;

    if (name && name !== project.name) {
      slug = generateSlugFromName(name);
      await this.alreadyExistsProject({ OR: [{ slug }, { name: name }] });
    }

    const desc = description ?? project.description;

    return await this.repository.updateProject(where, { name: name, slug, description: desc });
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

  /**
   * Retrieves a single project by unique identifier, throwing an error if not found.
   *
   * @async
   * @param where - Unique identifier for the project
   * @returns The full project including owner, members, invites, and secrets
   * @throws {AppError} ResourceNotFound — when the project does not exist
   */
  async getProjectOrThrow(where: Prisma.ProjectWhereUniqueInput): Promise<FullProject> {
    const project = await this.repository.findProject(where);
    if (!project) throw AppError.ResourceNotFound("Project");
    return project;
  }

  /**
   * Returns every project the current user owns or is a member of.
   * Logs the user and the result set via the debug logger for observability.
   *
   * @async
   * @returns All projects accessible to the authenticated user
   */
  async getUserProjects(): Promise<Array<FullProject>> {
    const prefix = "[ProjectService.getUserProjects]";
    logger.debug(`${prefix} User: ${this.user.email} (${this.user.id})`);

    const projects = await this.repository.findProjects({
      OR: [{ ownerId: this.user.id }, { members: { some: { userId: this.user.id } } }],
    });

    logger.debug(`${prefix} Projects: ${JSON.stringify(projects)}`);

    return projects;
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
    const toUser = await this.userService.getUser({ email: toEmail });

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

    const template = readFileSync(`${import.meta.dirname}/email/projectInvitation.html`, "utf-8");

    const emailHTMLContent = template
      .replace("{{EMAIL}}", toUser.email)
      .replace("{{INVITE_URL}}", `${EnvUtils.envVariables().appUrl}/join/${invite.slug}`)
      .replace("{{YEAR}}", String(new Date().getFullYear()));

    await new EmailUtils().sendEmail(toUser.email, "Invitation to join project", emailHTMLContent);

    return invite;
  }

  /**
   * Finds a project member by the given criteria, returning null if none matches.
   *
   * @param where - Prisma filter for the project member
   * @returns The matching ProjectMember record or null
   */
  async getMember(where: Prisma.ProjectMemberWhereInput) {
    return await this.repository.findProjectMember(where);
  }

  /**
   * Finds a project member by the given criteria, throwing an error if none matches.
   *
   * @param where - Prisma filter for the project member
   * @returns The matching ProjectMember record
   * @throws {AppError} ResourceNotFound — when no member matches the criteria
   */
  async getMemberOrThrow(where: Prisma.ProjectMemberWhereInput) {
    const member = await this.getMember(where);
    if (!member) throw AppError.ResourceNotFound("Member");
    return member;
  }

  /**
   * Finds a project invitation by unique identifier, throwing an error if not found.
   *
   * @param where - Prisma unique input identifying the invite
   * @returns The matching ProjectInvite record
   * @throws {AppError} ResourceNotFound — when no invite matches
   */
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
   * Removes a member from a project. The member being removed must hold the `ALL` or
   * `REMOVE_MEMBERS` permission in the target project. A user cannot remove themselves.
   *
   * @async
   * @param memberId - ID of the project member to remove
   * @param projectId - ID of the project the member belongs to
   * @throws {AppError} ResourceNotFound — when the project, the target member,
   *   or the member's permission assignment does not exist
   * @throws {AppError} Forbidden — when the member being removed does not hold
   *   ALL or REMOVE_MEMBERS permission
   * @throws {AppError} BadRequest — when attempting to remove the authenticated user
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

  /**
   * Retrieves a single permission assignment matching the given criteria, or null.
   *
   * @param where - Prisma filter for permission assignments
   * @returns The first matching ProjectMemberPermissionAssignment record or null
   */
  async getPermissionAssignment(where: Prisma.ProjectMemberPermissionAssignmentWhereInput) {
    return await this.repository.findProjectMemberPermissionAssignment(where);
  }

  /**
   * Retrieves a permission assignment matching the given criteria, throwing if none match.
   *
   * @param where - Prisma filter for permission assignments
   * @returns The first matching ProjectMemberPermissionAssignment record
   * @throws {AppError} ResourceNotFound — when no assignment matches the criteria
   */
  async getPermissionAssignmentOrThrow(where: Prisma.ProjectMemberPermissionAssignmentWhereInput) {
    const permissionAssignment = await this.getPermissionAssignment(where);
    if (!permissionAssignment) throw AppError.ResourceNotFound("Permission assignment");
    return permissionAssignment;
  }

  /**
   * Creates an encrypted secret within a project.
   * The caller must hold the {@code CREATE_SECRETS} or {@code ALL} permission.
   * The plain-text value is encrypted via AES-256-GCM before storage;
   * the raw value never reaches the database.
   *
   * @async
   * @param projectId - ID of the project to create the secret in
   * @param data - Name, value, and optional notes for the secret
   * @returns The created secret record (value is stored encrypted)
   * @throws {AppError} ResourceNotFound — when the project, member, or permission assignment does not exist
   * @throws {AppError} Forbidden — when the caller lacks CREATE_SECRETS or ALL permission
   */
  async createSecret(
    projectId: string,
    data: Pick<Prisma.SecretCreateInput, "name" | "notes" | "value">,
  ) {
    const project = await this.getProjectOrThrow({ id: projectId });
    const member = await this.getMemberOrThrow({
      user: { id: this.user.id },
      project: { id: project.id },
    });
    const permission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: member.id },
    });
    if (!this.policy.hasPermission(permission, ProjectMemberPermission.CREATE_SECRETS)) {
      throw AppError.Forbidden("You don't have permission to create secrets");
    }

    const crypto = new CryptoUtils(data.value);
    const secretValue = await crypto.encrypt();

    return await this.repository.createSecret({
      name: data.name,
      notes: data.notes,
      value: secretValue,
      project: { connect: { id: project.id } },
      addedBy: { connect: { id: member.id } },
      updatedBy: { connect: { id: member.id } },
    });
  }

  /**
   * Permanently deletes a secret by its ID.
   * The caller must hold the {@code DELETE_SECRETS} or {@code ALL} permission.
   * Authorization is scoped to the caller's project membership — the member
   * lookup uses only the user ID without filtering by a specific project,
   * which means a member with the right permission in any project can delete
   * any secret they target.
   *
   * @async
   * @param id - Unique identifier of the secret to delete
   * @throws {AppError} ResourceNotFound — when the member or permission assignment does not exist
   * @throws {AppError} Forbidden — when the caller lacks DELETE_SECRETS or ALL permission
   */
  async deleteSecret(id: string) {
    const member = await this.getMemberOrThrow({
      user: { id: this.user.id },
    });
    const permission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: member.id },
    });
    if (!this.policy.hasPermission(permission, ProjectMemberPermission.DELETE_SECRETS)) {
      throw AppError.Forbidden("You don't have permission to delete secrets");
    }

    return await this.repository.deleteSecret({ id });
  }

  /**
   * Updates a secret's name, notes, and/or value.
   * The caller must hold the {@code UPDATE_SECRETS} or {@code ALL} permission.
   * When a new value is provided it is encrypted via AES-256-GCM; when omitted,
   * the existing (already-encrypted) value is preserved as-is without
   * re-encryption to avoid unnecessary key derivation overhead.
   *
   * @async
   * @param id - Unique identifier of the secret to update
   * @param data - Partial fields to update ({@code name?}, {@code notes?}, {@code value?})
   * @returns The updated secret record (value is stored encrypted)
   * @throws {AppError} ResourceNotFound — when the member, permission assignment, or secret does not exist
   * @throws {AppError} Forbidden — when the caller lacks UPDATE_SECRETS or ALL permission
   */
  async updateSecret(id: string, data: Pick<Prisma.SecretUpdateInput, "name" | "notes" | "value">) {
    const member = await this.getMemberOrThrow({
      user: { id: this.user.id },
    });
    const permission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: member.id },
    });
    if (!this.policy.hasPermission(permission, ProjectMemberPermission.UPDATE_SECRETS)) {
      throw AppError.Forbidden("You don't have permission to update secrets");
    }

    const secretValue = data.value ?? (await this.getSecretOrThrow(id)).value;
    const crypto = new CryptoUtils(String(secretValue));
    const encryptedSecretValue = data.value
      ? await crypto.encrypt()
      : (await this.getSecretOrThrow(id)).value;

    const secret = await this.repository.updateSecret(
      { id },
      {
        name: data.name,
        notes: data.notes,
        value: encryptedSecretValue,
        updatedBy: { connect: { id: member.id } },
      },
    );

    return await this.getSecret(secret.id);
  }

  /**
   * Retrieves a single secret by ID with its value decrypted.
   * The caller must hold the {@code READ_SECRETS} or {@code ALL} permission.
   * Returns {@code null} (not an error) when the secret does not exist after
   * the authorization check passes, allowing the caller to distinguish
   * "not found" from "forbidden" at the route layer.
   *
   * @async
   * @param id - Unique identifier of the secret
   * @returns The secret with its value decrypted, or {@code null} if not found
   * @throws {AppError} ResourceNotFound — when the member or permission assignment does not exist
   * @throws {AppError} Forbidden — when the caller lacks READ_SECRETS or ALL permission
   */
  async getSecret(id: string) {
    const member = await this.getMemberOrThrow({
      user: { id: this.user.id },
    });
    const permission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: member.id },
    });
    if (!this.policy.hasPermission(permission, ProjectMemberPermission.READ_SECRETS)) {
      throw AppError.Forbidden("You don't have permission to read secrets");
    }

    const cryptedSecret = await this.repository.findSecret({ id });
    if (!cryptedSecret) return cryptedSecret;

    const crypter = new CryptoUtils(cryptedSecret.value);
    const decryptedSecretValue = await crypter.decrypt();

    return {
      ...cryptedSecret,
      value: decryptedSecretValue,
    };
  }

  /**
   * Retrieves a secret by ID with decryption, throwing if not found.
   * Authorization is delegated to {@link getSecret}.
   *
   * @async
   * @param id - Unique identifier of the secret
   * @returns The secret with its value decrypted
   * @throws {AppError} ResourceNotFound — when the secret does not exist
   * @throws {AppError} Forbidden — when the caller lacks the required permission
   */
  async getSecretOrThrow(id: string) {
    const secret = await this.getSecret(id);
    if (!secret) throw AppError.ResourceNotFound("Secret");
    return secret;
  }

  /**
   * Retrieves all secrets belonging to a project with their values decrypted.
   * The caller must hold the {@code READ_SECRETS} or {@code ALL} permission.
   * Each secret is individually decrypted via AES-256-GCM in a sequential loop;
   * decryption errors on a single secret will cause the entire request to fail
   * rather than returning a partial result set.
   *
   * @async
   * @param projectId - ID of the project whose secrets are being listed
   * @returns An array of secrets with decrypted values
   * @throws {AppError} ResourceNotFound — when the member or permission assignment does not exist
   * @throws {AppError} Forbidden — when the caller lacks READ_SECRETS or ALL permission
   */
  async getProjectSecrets(projectId: string) {
    const prefix = "[Service.getProjectSecrets]";

    const member = await this.getMemberOrThrow({
      user: { id: this.user.id },
    });
    const permission = await this.getPermissionAssignmentOrThrow({
      projectMember: { id: member.id },
    });
    if (!this.policy.hasPermission(permission, ProjectMemberPermission.READ_SECRETS)) {
      throw AppError.Forbidden("You don't have permission to read secrets");
    }

    const encryptedSecrets = await this.repository.findManySecrets({ project: { id: projectId } });

    logger.debug(`${prefix} Decrypting ${encryptedSecrets.length} secrets`);

    const decryptedSecrets = [];
    for (const secret of encryptedSecrets) {
      const crypter = new CryptoUtils(secret.value);
      const decryptedSecretValue = await crypter.decrypt();
      const entry = { ...secret, value: decryptedSecretValue };
      logger.debug(
        `${prefix} IS ARRAY ENTRY PLAIN: ${Array.isArray([entry])} ${JSON.stringify(entry)}`,
      );
      decryptedSecrets.push(entry);
    }

    logger.debug(`${prefix} IS ARRAY: ${Array.isArray(decryptedSecrets)}`);
    return decryptedSecrets;
  }
}
