import type { Prisma, ProjectMemberPermission } from "@prisma/client";
import { AppError } from "../../core/errors/appError.js";
import { UserService } from "../user/service.js";
import { projectRepository } from "./repository.js";
import { ProjectGuard } from "./guard.js";
import { generateSlugFromName } from "./utils.js";
import { EmailUtils } from "../../utils/email.js";
import { EnvUtils } from "../../utils/env.js";

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
   * @async
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
   * @async
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
   * @async
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
   * @async
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
   * @async
   * @param where - Unique identifier for the project
   * @returns The full project including owner, members, invites, and secrets
   * @throws {AppError} NotFound — when the project does not exist
   */
  async getProject(where: Prisma.ProjectWhereUniqueInput) {
    return await this.guard.getProjectOrThrow(where);
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

    const project = await this.guard.getProjectOrThrow({ id: projectId });

    const fromMember = await this.repository.findProjectMember({
      user: { id: this.userId },
      project: { id: project.id },
    });
    if (!fromMember) throw AppError.ResourceNotFound("Member not found");

    const fromMemberPermission = await this.repository.findProjectMemberPermissionAssignment({
      projectMember: { id: fromMember.id },
    });

    if (!fromMemberPermission) throw Error("Member permission not found");
    if (
      fromMemberPermission.permission !== "ALL" &&
      fromMemberPermission.permission !== "CREATE_INVITES"
    ) {
      throw AppError.Forbidden("You don't have permission to create invites");
    }

    const existsUserMember = await this.repository.findProjectMember({
      user: { id: toUser.id },
      project: { id: project.id },
    });
    if (existsUserMember) throw AppError.BadRequest("User is already a member of this project");

    const expiresAt = new Date();
    // Invitation expires 7 calendar days from creation
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invite = await this.repository.createInvite({
      project: { connect: { id: projectId } },
      // Derive a deterministic, unique slug per user-project pair to prevent collisions
      slug: generateSlugFromName(toUser.email + project.id),
      expiresAt,
    });

    const emailHTMLContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Project Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(37,99,235,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 60%,#3b82f6 100%);padding:48px 40px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:30px;margin-bottom:20px;">📬</div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">You're Invited!</h1>
              <p style="margin:10px 0 0;color:#bfdbfe;font-size:15px;">You have been invited to collaborate on a project</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#1e3a5f;font-size:16px;line-height:1.6;">
                Hi <strong>${toUser.email}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                A team member has invited you to join a project. Collaborate, share ideas, and build something great together.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);border-radius:8px;">
                    <a href=${EnvUtils.envVariables().appUrl + "/join/" + invite.slug} style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6;">
                      🔒 &nbsp;This invitation is personal and intended only for you. If you weren't expecting this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 36px;text-align:center;">
              <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">
                You received this email because someone invited you to a project.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} SecureVault. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    await new EmailUtils().sendEmail(toUser.email, "Invitation to join project", emailHTMLContent);
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
    const invite = await this.repository.findProjectInvite({ slug: slug });
    if (!invite) throw AppError.ResourceNotFound("Invite not found");

    if (invite.expiresAt < new Date()) throw AppError.BadRequest("Invite has expired");

    const user = await this.guard.getUserOrThrow(this.userId);
    const existsUserMember = await this.repository.findProjectMember({
      user: { id: user.id },
      project: { id: invite.projectId },
    });
    if (existsUserMember) throw AppError.BadRequest("User is already a member of this project");

    await this.repository.createMember({
      user: { connect: { id: user.id } },
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
    const user = await this.guard.getUserOrThrow(this.userId);
    const project = await this.guard.getProjectOrThrow({ id: projectId });
    const member = await this.repository.findProjectMember({ id: memberId });
    if (!member) throw AppError.ResourceNotFound("Member not found");

    const memberPermission = await this.repository.findProjectMemberPermissionAssignment({
      projectMember: { id: member.id },
    });
    if (!memberPermission) throw Error("Member permission not found");
    if (memberPermission.permission !== "ALL" && memberPermission.permission !== "REMOVE_MEMBERS") {
      throw AppError.Forbidden("You don't have permission to remove members");
    }
    if (member.userId === user.id) throw AppError.BadRequest("You cannot remove yourself");

    await this.repository.deleteProjectMember({ id: member.id, projectId: project.id });
  }

  /**
   * Grants one or more permissions to a project member.
   * Not yet implemented — throws unconditionally. Parameters are prefixed with `_`
   * to suppress unused-variable warnings until the implementation is complete.
   *
   * @async
   * @param _userId - Target user ID receiving the permissions
   * @param _projectId - Project in which the permissions are granted
   * @param _permissions - Set of `ProjectMemberPermission` values to assign
   * @throws {Error} Always — implementation is pending
   */
  async addPermissionToMember(
    _userId: string,
    _projectId: string,
    _permissions: Array<ProjectMemberPermission>,
  ) {
    throw new Error("addPermissionToMember is not yet implemented");
  }
}
