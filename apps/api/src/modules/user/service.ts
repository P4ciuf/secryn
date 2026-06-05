import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../core/errors/appError.js";
import { userRepository, type FullUser, type SafeUser } from "./repository.js";
import { randomBytes } from "node:crypto";
import type { LoggedUser, RegisterBody, UpdateUserInput } from "@repo/shared";
import { logger } from "../../core/logger/index.js";

/**
 * Business-logic layer for user management.
 * Wraps the repository with validation, password hashing, and conflict checks.
 */
export class UserService {
  private readonly repository = userRepository;
  private readonly user: LoggedUser;

  /**
   * @param user - The authenticated user this service instance operates on behalf of
   */
  private constructor(user: LoggedUser) {
    this.user = user;
  }

  /**
   * Checks whether the given user is the same as the instance-scoped user.
   * Used to enforce that users can only mutate their own data.
   *
   * @param user - The user to compare against the instance-scoped user
   * @returns True when both users share the same ID
   */
  private isAuthorized(user: LoggedUser) {
    if (this.user.id === user.id) {
      return true;
    }
    return false;
  }

  /**
   * Async factory that resolves a user from the database and returns a scoped UserService.
   *
   * @param userId - The authenticated user's ID
   * @returns A UserService instance bound to the resolved user
   * @throws {AppError} ResourceNotFound when the user does not exist
   */
  static async Instance(userId: string) {
    const user = await userRepository.find({ id: userId });
    if (!user) throw AppError.ResourceNotFound("User");
    return new UserService(user);
  }

  /**
   * Hashes a plain-text password using bcrypt with a cost factor of 12.
   *
   * @param password - Plain-text password
   * @returns The bcrypt hash
   */
  static async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Compares a plain-text password against a bcrypt hash.
   *
   * @param password - Plain-text password to verify
   * @param hash - Stored bcrypt hash
   * @returns True if the password matches the hash
   */
  static async comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Creates a new user after checking for duplicate email or username.
   * Auto-generates a random username when none is provided.
   *
   * @param data - Registration payload containing email, password, and optional username
   * @throws {AppError} Conflict if the email or username already exists
   */
  async createUser(data: RegisterBody) {
    const exists = await this.repository.find({
      OR: [{ email: data.email }, { username: data.username }],
    });
    if (exists) throw AppError.Conflict("User already exists");

    const { password, username, ...rest } = data;
    const hashedPassword = await UserService.hashPassword(password);

    // Fallback username: auto-generate one from random hex when the user omits it
    const user = await this.repository.create({
      ...rest,
      username: username ?? `User#${randomBytes(4).toString("hex")}`,
      password: hashedPassword,
    });
    return user;
  }

  /**
   * Deletes the authenticated user after confirming existence.
   *
   * @throws {AppError} ResourceNotFound if the user does not exist
   */
  async deleteUser() {
    const user = await this.getUserOrThrow({ id: this.user.id });

    if (!this.isAuthorized(user)) {
      throw AppError.Unauthorized("Not authorized to delete this user");
    }

    const deletedUser = await this.repository.delete({ id: this.user.id });
    return deletedUser;
  }

  /**
   * Retrieves a user by unique identifier.
   *
   * @param where - Prisma unique identifier
   * @returns The user entity with relations, or null
   */
  async getUser(where: Prisma.UserWhereUniqueInput): Promise<FullUser | null> {
    return (await this.repository.find(where)) as FullUser | null;
  }

  /**
   * Retrieves a user without sensitive fields (password, MFA codes, bans).
   *
   * @param where - Prisma unique identifier
   * @returns The safe user projection, or null if not found
   */
  async getUserSafe(where: Prisma.UserWhereUniqueInput): Promise<SafeUser | null> {
    return await this.repository.find(where, true);
  }

  /**
   * Retrieves a user by unique identifier, throwing an error if not found.
   *
   * @param where - Prisma unique identifier
   * @returns The user entity
   * @throws {AppError} ResourceNotFound if the user does not exist
   */
  async getUserOrThrow(where: Prisma.UserWhereUniqueInput) {
    const user = await this.getUser(where);
    if (!user) throw AppError.ResourceNotFound("User");
    return user;
  }

  /**
   * Updates a user after confirming existence and authorization.
   * When updating the password, the current password must match and the new
   * password is hashed via bcrypt with cost factor 12.
   *
   * @param data - Fields to update (name, email, currentPassword, newPassword)
   * @throws {AppError} ResourceNotFound if the user does not exist
   * @throws {AppError} Unauthorized if not authorized or current password is wrong
   * @throws {AppError} Conflict if the email or username is already taken
   */
  async updateUser(data: UpdateUserInput) {
    logger.debug(
      `[UserService.updateUser]: userId: ${this.user.id}, data: username: ${data.name}, email: ${data.email}`,
    );

    const user = await this.getUserOrThrow({ id: this.user.id });

    if (!this.isAuthorized(user)) {
      throw AppError.Unauthorized("Not authorized to update this user");
    }

    const { name, email, currentPassword, newPassword } = data;

    if (email && email !== user.email) {
      const emailExists = await this.repository.find({ email });
      if (emailExists) throw AppError.Conflict("User already exists");
    }

    if (name && name !== user.username) {
      const nameExists = await this.repository.find({ username: name });
      if (nameExists) throw AppError.Conflict("User already exists");
    }

    let password = user.password;
    if (currentPassword && newPassword) {
      const isMatch = await UserService.comparePassword(currentPassword, user.password);
      if (!isMatch) throw AppError.Unauthorized("Invalid current password");

      password = await UserService.hashPassword(newPassword);
    }

    return await this.repository.update({ id: this.user.id }, { username: name, email, password });
  }

  /**
   * Counts users matching an optional filter.
   *
   * @param where - Optional Prisma filter
   * @returns The total count of matching users
   */
  async countUsers(where?: Prisma.UserWhereInput) {
    return await this.repository.count(where);
  }
}
