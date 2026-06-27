import type { Prisma, UserReactivationCode } from "@prisma/client";
import { prisma } from "../db/prisma";

/**
 * User entity with related bans eagerly loaded.
 * Used as the standard return type across the repository.
 */
export type FullUser = Prisma.UserGetPayload<{
  include: {
    bans: true;
  };
}>;

/**
 * Data-access layer for the User aggregate. Every method that returns a user
 * includes the same relational shape (bans) for consistency. Password-reset
 * tokens have their own dedicated methods.
 */
export class UserRepository {
  /**
   * Creates a new user record. The caller must hash the password before
   * passing it in the data payload.
   *
   * @param data - Prisma create input (email, hashed password, username).
   * @returns The newly created user with bans eagerly loaded.
   */
  async createUser(data: Prisma.UserCreateInput): Promise<FullUser> {
    return prisma.user.create({
      data,
      include: { bans: true },
    });
  }

  /**
   * Finds the first user matching the given criteria. Returns null when no
   * user matches — use in service-layer lookups where absence is not an error.
   *
   * @param where - Prisma filter (e.g. by id, email, or compound clauses).
   * @returns The matched user with bans loaded, or null.
   */
  async findUser(where: Prisma.UserWhereInput): Promise<FullUser | null> {
    return prisma.user.findFirst({
      where,
      include: { bans: true },
    });
  }

  /**
   * Updates a single user identified by a unique constraint (id, email, or username).
   *
   * @param where - Unique identifier for the target user.
   * @param data  - Fields to update (partial payload is valid).
   * @returns The updated user with bans eagerly loaded.
   */
  async updateUser(
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput,
  ): Promise<FullUser> {
    return prisma.user.update({
      where,
      data,
      include: { bans: true },
    });
  }

  /**
   * Bulk-updates all users matching the given criteria. Returns the count of
   * affected rows rather than individual user objects — use {@link updateUser}
   * for single-user updates that need the full entity returned.
   */
  async updateUsers(where: Prisma.UserWhereInput, data: Prisma.UserUpdateInput) {
    return await prisma.user.updateMany({
      where,
      data,
    });
  }

  /**
   * Retrieves all users matching the given criteria, or all users when no
   * filter is provided. Each record includes its bans relationship.
   *
   * @param where - Optional Prisma filter clause.
   * @returns An array of matching users (may be empty).
   */
  async findUsers(where?: Prisma.UserWhereInput): Promise<FullUser[]> {
    return prisma.user.findMany({
      where,
      include: { bans: true },
    });
  }

  /**
   * Permanently deletes a user and cascades to related records (bans,
   * memberships, API keys, password-reset tokens, reactivation codes).
   *
   * @param where - Unique identifier for the user to delete.
   * @returns The deleted user record with bans loaded.
   */
  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<FullUser> {
    return prisma.user.delete({
      where,
      include: { bans: true },
    });
  }

  /**
   * Looks up a password-reset token by its random hex value. Used during the
   * reset-password flow to validate that the token exists and is still valid.
   *
   * @param token - The random hex string embedded in the password-reset email.
   * @returns The token record, or null if not found.
   */
  async findPasswordResetToken(
    token: string,
  ): Promise<Prisma.PasswordResetTokenGetPayload<Record<string, never>> | null> {
    return prisma.passwordResetToken.findFirst({ where: { token } });
  }

  /**
   * Stores a new password-reset token. The caller is responsible for
   * generating the random token and setting a 1-hour expiry.
   *
   * @param data - Full create input (token string, expiresAt, user relation).
   */
  async createPasswordResetToken(data: Prisma.PasswordResetTokenCreateInput): Promise<void> {
    await prisma.passwordResetToken.create({ data });
  }

  /**
   * Marks a password-reset token as consumed by setting `used` to true,
   * preventing the same token from being reused.
   *
   * @param id - The CUID of the token record to consume.
   */
  async consumePasswordResetToken(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }

  /**
   * Stores a new user reactivation code. The caller is responsible for
   * generating the token and setting the expiry before calling this method.
   *
   * @param data - Full create input including userId, code string, and expiresAt.
   */
  async createUserReactivationCode(data: Prisma.UserReactivationCodeCreateInput): Promise<void> {
    await prisma.userReactivationCode.create({ data });
  }

  /**
   * Marks an existing reactivation code as consumed by setting its `usedAt`
   * timestamp to now, which prevents reuse.
   *
   * @param id - The CUID of the reactivation code record to consume.
   */
  async consumeUserReactivationCode(id: string): Promise<void> {
    await prisma.userReactivationCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Retrieves the first reactivation code for the given user. Because
   * `userId` is unique on the model, at most one record will exist.
   *
   * @param userId - ID of the user whose reactivation code to look up.
   * @returns The code record, or null if none exists.
   */
  async findUserReactivationCode(userId: string): Promise<UserReactivationCode | null> {
    return prisma.userReactivationCode.findFirst({ where: { userId } });
  }
}

/** Singleton repository instance used throughout the application. */
export const userRepository = new UserRepository();
