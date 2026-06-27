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
  async createUser(data: Prisma.UserCreateInput): Promise<FullUser> {
    return prisma.user.create({
      data,
      include: { bans: true },
    });
  }

  async findUser(where: Prisma.UserWhereInput): Promise<FullUser | null> {
    return prisma.user.findFirst({
      where,
      include: { bans: true },
    });
  }

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

  async findUsers(where?: Prisma.UserWhereInput): Promise<FullUser[]> {
    return prisma.user.findMany({
      where,
      include: { bans: true },
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<FullUser> {
    return prisma.user.delete({
      where,
      include: { bans: true },
    });
  }

  async findPasswordResetToken(
    token: string,
  ): Promise<Prisma.PasswordResetTokenGetPayload<Record<string, never>> | null> {
    return prisma.passwordResetToken.findFirst({ where: { token } });
  }

  async createPasswordResetToken(data: Prisma.PasswordResetTokenCreateInput): Promise<void> {
    await prisma.passwordResetToken.create({ data });
  }

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
