import bcrypt from "bcrypt";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { userRepository, type FullUser } from "../repositories/user";
import { ApiError } from "../errors/apiError";
import { EmailUtils } from "@/utils/email";
import { EnvUtils } from "@/utils/env";

const BCRYPT_ROUNDS = 12;

/**
 * User management service: CRUD and password hashing.
 *
 * Use the static {@link Instance} factory to create a scoped instance.
 */
export class UserService {
  private readonly repository = userRepository;

  private constructor(private readonly userId: string | null) {}

  /**
   * Creates a service instance scoped to the given user. Pass `null` for
   * operations that do not require a specific user context.
   */
  static async Instance(userId: string | null): Promise<UserService> {
    return new UserService(userId);
  }

  /**
   * Hashes a plain-text password with bcrypt at 12 salt rounds.
   * Used during registration and password changes.
   */
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  /**
   * Compares a plain-text password against a bcrypt hash in constant time.
   */
  static async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Finds a user by ID or email. Returns `null` when no match is found —
   * callers that need to error on absence should use {@link getUserOrThrow}.
   */
  async getUser(where: { id?: string; email?: string }): Promise<FullUser | null> {
    return this.repository.findUser(where);
  }

  /**
   * Retrieves all users matching the given criteria. An empty result set
   * is returned when no users match — no error is thrown.
   *
   * @param where - Optional Prisma filter clause.
   * @returns All matching users as {@link FullUser} records.
   */
  async getUsers(where?: Prisma.UserWhereInput): Promise<FullUser[]> {
    return this.repository.findUsers(where);
  }

  /**
   * Finds a user by ID or email, throwing {@link ApiError.ResourceNotFound}
   * when no match is found.
   */
  async getUserOrThrow(where: { id?: string; email?: string }): Promise<FullUser> {
    const user = await this.getUser(where);
    if (!user) throw ApiError.ResourceNotFound("User");
    return user;
  }

  /**
   * Creates a new user with a hashed password. If no username is provided, a
   * random 16-character hex string is generated.
   */
  async createUser(data: {
    email: string;
    password: string;
    username?: string;
  }): Promise<FullUser> {
    const username = data.username ?? crypto.randomBytes(8).toString("hex");
    const hashedPassword = await UserService.hashPassword(data.password);

    return this.repository.createUser({
      email: data.email,
      password: hashedPassword,
      username,
    });
  }

  /**
   * Updates a user's username, email, and/or password. The caller is
   * responsible for validation (email uniqueness, current password check).
   */
  async updateUser(
    userId: string,
    data: { username?: string; email?: string; password?: string; isVerified?: boolean },
  ): Promise<FullUser> {
    return this.repository.updateUser({ id: userId }, data);
  }

  /**
   * Bulk-updates multiple users matching the given criteria. Useful for
   * batch operations like disabling or re-enabling cohorts of users. The
   * update payload is restricted to non-sensitive fields — id, email,
   * password, username, and role cannot be changed through this method.
   *
   * @param where - Prisma filter to select which users to update.
   * @param data  - Subset of UserUpdateInput allowed for bulk operations.
   */
  async updateUsers(
    where: Prisma.UserWhereInput,
    data: Omit<Prisma.UserUpdateInput, "id" | "email" | "password" | "username" | "role">,
  ) {
    return this.repository.updateUsers(where, data);
  }

  /**
   * Permanently deletes a user and cascades to owned projects and secrets.
   */
  async deleteUser(userId: string): Promise<FullUser> {
    return this.repository.deleteUser({ id: userId });
  }

  /**
   * Validates a plain-text password against the stored bcrypt hash for the
   * given user. Used by NextAuth's credentials provider during sign-in.
   *
   * @param userId - ID of the user whose password is being verified
   * @param pw     - The plain-text password to check
   * @returns True when the password matches the stored hash
   */
  async validatePassword(userId: string, pw: string): Promise<boolean> {
    const user = await this.getUserOrThrow({ id: userId });
    return await UserService.comparePassword(pw, user.password);
  }

  /**
   * Disables a single user account: sets `isActive` to false, records the
   * current timestamp in `disabledAt`, generates a 30-day reactivation token,
   * and sends a deactivation email with a reactivation link.
   *
   * @param userId - ID of the user to disable.
   * @returns The updated user record.
   */
  async disableUser(userId: string): Promise<FullUser> {
    const user = await this.getUserOrThrow({ id: userId });
    const emailUtils = new EmailUtils();
    const token = crypto.randomBytes(32).toString("hex");
    const template = emailUtils.getTemplate("accountDeactivation");
    const html = emailUtils.insertVariables(template, {
      EMAIL: user.email,
      REACTIVATE_URL: `${EnvUtils.variables.appUrl}/reactivate?token=${token}`,
    });

    await this.repository.createUserReactivationCode({
      user: { connect: { id: userId } },
      code: token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    await emailUtils.sendEmail(user.email, "account-deactivation", html);
    return this.repository.updateUser({ id: userId }, { isActive: false, disabledAt: new Date() });
  }

  /**
   * Bulk-disables all users matching the given criteria by delegating to
   * {@link disableUser} for each matched record.
   *
   * @param where - Prisma filter to select which users to disable.
   */
  async disableUsers(where: Prisma.UserWhereInput) {
    const users = await this.getUsers(where);
    return users.forEach(async (u) => await this.disableUser(u.id));
  }

  /**
   * Reactivates a previously disabled user: sets `isActive` back to true,
   * clears `disabledAt`, and sends a welcome-back email.
   *
   * @param userId - ID of the user to reactivate.
   * @returns The updated user record.
   */
  async activateUser(userId: string): Promise<FullUser> {
    const user = await this.getUserOrThrow({ id: userId });
    const emailUtils = new EmailUtils();
    const template = emailUtils.getTemplate("accountActivation");
    const html = emailUtils.insertVariables(template, {
      EMAIL: user.email,
      LOGIN_URL: `${EnvUtils.variables.appUrl}/login`,
    });
    await emailUtils.sendEmail(user.email, "account-activation", html);
    return this.repository.updateUser({ id: userId }, { isActive: true, disabledAt: null });
  }

  /**
   * Bulk-reactivates all users matching the given criteria by delegating to
   * {@link activateUser} for each matched record.
   *
   * @param where - Prisma filter to select which users to reactivate.
   */
  async activateUsers(where: Prisma.UserWhereInput) {
    const users = await this.getUsers(where);
    return users.forEach(async (u) => await this.activateUser(u.id));
  }
}
