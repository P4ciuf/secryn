import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

/**
 * User entity with related MFA recovery codes and bans eagerly loaded.
 * Used as the standard return type across the repository.
 */
export type FullUser = Prisma.UserGetPayload<{
  include: {
    mfaRecoveryCodes: true;
    bans: true;
  };
}>;

/**
 * Data-access layer for the User aggregate. Every method that returns a user
 * includes the same relational shape (MFA recovery codes + bans) for
 * consistency. Password-reset tokens and recovery codes have their own
 * dedicated methods.
 */
export class UserRepository {
  async createUser(data: Prisma.UserCreateInput): Promise<FullUser> {
    return prisma.user.create({
      data,
      include: { mfaRecoveryCodes: true, bans: true },
    });
  }

  async findUser(where: Prisma.UserWhereInput): Promise<FullUser | null> {
    return prisma.user.findFirst({
      where,
      include: { mfaRecoveryCodes: true, bans: true },
    });
  }

  async updateUser(
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput,
  ): Promise<FullUser> {
    return prisma.user.update({
      where,
      data,
      include: { mfaRecoveryCodes: true, bans: true },
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<FullUser> {
    return prisma.user.delete({
      where,
      include: { mfaRecoveryCodes: true, bans: true },
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

  async findRecoveryCode(
    code: string,
  ): Promise<Prisma.MFARecoveryCodeGetPayload<Record<string, never>> | null> {
    return prisma.mFARecoveryCode.findFirst({ where: { code } });
  }

  async consumeRecoveryCode(id: string): Promise<void> {
    await prisma.mFARecoveryCode.update({
      where: { id },
      data: { isValid: false },
    });
  }

  async createRecoveryCode(data: Prisma.MFARecoveryCodeCreateInput): Promise<void> {
    await prisma.mFARecoveryCode.create({ data });
  }

  async deleteRecoveryCodes(userId: string): Promise<void> {
    await prisma.mFARecoveryCode.deleteMany({ where: { userId } });
  }
}

/** Singleton repository instance used throughout the application. */
export const userRepository = new UserRepository();
