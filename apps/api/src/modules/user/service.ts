import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../core/errors/appError.js";
import { userRepository } from "./repository.js";
import { randomBytes } from "node:crypto";
import type { RegisterBody } from "@repo/shared";

/**
 * Business-logic layer for user management.
 * Wraps the repository with validation, password hashing, and conflict checks.
 */
export class UserService {
  private readonly repository = userRepository;

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
   * @param data - User creation parameters
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
   * Deletes a user by unique identifier after confirming existence.
   *
   * @param where - Prisma unique identifier
   * @throws {AppError} ResourceNotFound if the user does not exist
   */
  async deleteUser(where: Prisma.UserWhereUniqueInput) {
    const exists = await this.repository.find(where);
    if (!exists) throw AppError.ResourceNotFound("User");

    const user = await this.repository.delete(where);
    return user;
  }

  /**
   * Retrieves a user by unique identifier.
   *
   * @param where - Prisma unique identifier
   * @returns The user entity with relations, or null
   */
  async getUser(where: Prisma.UserWhereUniqueInput) {
    return await this.repository.find(where);
  }

  /**
   * Retrieves a user by unique identifier, throwing an error if not found.
   *
   * @param where - Prisma unique identifier
   * @returns The user entity
   * @throws {AppError} ResourceNotFound if the user does not exist
   */
  async getUserOrThrow(where: Prisma.UserWhereUniqueInput) {
    const user = await this.repository.find(where);
    if (!user) throw AppError.ResourceNotFound("User");
    return user;
  }

  /**
   * Updates a user after confirming existence.
   *
   * @param where - Prisma unique identifier
   * @param data - Fields to update
   * @throws {AppError} ResourceNotFound if the user does not exist
   */
  async updateUser(where: Prisma.UserWhereUniqueInput, data: Prisma.UserUpdateInput) {
    const exists = await this.repository.find(where);
    if (!exists) throw AppError.ResourceNotFound("User");

    const user = await this.repository.update(where, data);
    return user;
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
