import type { Prisma } from "@prisma/client";
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
}

/** Singleton repository instance used throughout the application. */
export const userRepository = new UserRepository();
