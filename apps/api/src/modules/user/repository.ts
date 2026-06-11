import type { MFARecoveryCode, PasswordResetToken, Prisma, User } from "@prisma/client";
import { prisma } from "../../core/db/prisma.js";

/**
 * User entity with all related data loaded (MFA recovery codes, bans, team memberships).
 */
export type FullUser = Prisma.UserGetPayload<{
  include: {
    mfaRecoveryCodes: true;
    bans: true;
    addedBans: true;
    members: true;
    projects: true;
  };
}>;

/**
 * Public-facing user projection excluding sensitive fields (password, MFA codes, bans).
 */
export type SafeUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    username: true;
    role: true;
    isMFAEnabled: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

/**
 * Data access layer for the User model.
 * Encapsulates Prisma queries with a fixed include set for relationships.
 */
class UserRepository {
  private readonly userInclude: Prisma.UserInclude = {
    mfaRecoveryCodes: true,
    bans: true,
    addedBans: true,
    members: true,
    projects: true,
  };

  /**
   * Finds the first user matching the given filter.
   *
   * @param where - Prisma where clause for filtering
   * @param safe - When true, returns only public fields (SafeUser); otherwise returns the full entity
   * @returns The full user with relations, or null if not found
   */
  async find(where: Prisma.UserWhereInput, safe?: boolean): Promise<FullUser | SafeUser | null> {
    if (safe) {
      return prisma.user.findFirst({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isMFAEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      return prisma.user.findFirst({ where, include: this.userInclude });
    }
  }

  /**
   * Creates a new user.
   *
   * @param data - Prisma create input
   * @returns The created user (without relations), or null on failure
   */
  async create(data: Prisma.UserCreateInput): Promise<User | null> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Updates an existing user identified by a unique key.
   *
   * @param where - Prisma unique identifier
   * @param data - Fields to update
   * @returns The updated user with relations, or null if not found
   */
  async update(
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput,
  ): Promise<FullUser | null> {
    return prisma.user.update({
      where,
      data,
      include: this.userInclude,
    });
  }

  /**
   * Deletes a user by unique identifier.
   *
   * @param where - Prisma unique identifier
   * @returns The deleted user with relations, or null if not found
   */
  async delete(where: Prisma.UserWhereUniqueInput): Promise<FullUser | null> {
    return prisma.user.delete({
      where,
      include: this.userInclude,
    });
  }

  /**
   * Counts users matching an optional filter.
   *
   * @param where - Optional Prisma filter
   * @returns The total count of matching users
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  /**
   * Persists a new MFA recovery code record. The code value is stored as an
   * HMAC-SHA256 hash derived from the original plaintext — the original code
   * is never written to the database.
   *
   * @param data - Prisma create input with the hashed code and user relation
   * @returns The created recovery code record
   */
  async createMFACode(data: Prisma.MFARecoveryCodeCreateInput): Promise<MFARecoveryCode> {
    return prisma.mFARecoveryCode.create({ data });
  }

  /**
   * Looks up a recovery code by its hashed value. Since codes are stored as
   * HMAC‑SHA256 hashes, callers must pre‑hash the user input before lookup.
   *
   * @param code - The HMAC-SHA256 hex digest of the user-supplied code
   * @returns The matching recovery code or null if not found
   */
  async findMFACode(code: string): Promise<MFARecoveryCode | null> {
    return prisma.mFARecoveryCode.findUnique({ where: { code } });
  }

  /**
   * Marks a recovery code as consumed by setting its {@code isValid} flag to
   * false. Once consumed the code can never be used again.
   *
   * @param code - The HMAC‑SHA256 hash of the code to invalidate
   * @returns The updated recovery code record
   */
  async consumeMFACode(code: string): Promise<MFARecoveryCode> {
    return prisma.mFARecoveryCode.update({
      where: { code },
      data: { isValid: false },
    });
  }

  /**
   * Deletes all recovery codes (both valid and consumed) for a user.
   * Called when MFA is disabled or before regenerating a fresh set.
   *
   * @param userId - The owning user's unique identifier
   * @returns A batch delete result with the count of removed rows
   */
  async deleteMFACodes(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.mFARecoveryCode.deleteMany({ where: { userId } });
  }

  /**
   * Retrieves all valid (unused) recovery codes for a user, ordered by
   * creation time ascending. Returns hashed code values — the original
   * plaintext is never recoverable from storage.
   *
   * @param userId - The owning user's unique identifier
   * @returns Array of valid recovery code records
   */
  async getValidRecoveryCodes(userId: string): Promise<MFARecoveryCode[]> {
    return prisma.mFARecoveryCode.findMany({
      where: { userId, isValid: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Persists a new password reset token for the given user.
   * Tokens are stored as plaintext since they are cryptographically random
   * and expire after 1 hour — hashing is unnecessary here.
   *
   * @param data - Prisma create input for the token
   * @returns The created password reset token record
   */
  async createPasswordResetToken(
    data: Prisma.PasswordResetTokenCreateInput,
  ): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({ data });
  }

  /**
   * Looks up a password reset token by its plaintext value.
   *
   * @param token - The plaintext token string
   * @returns The matching token or null if not found
   */
  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findUnique({ where: { token } });
  }

  /**
   * Marks a password reset token as consumed so it cannot be reused.
   *
   * @param id - The token's unique identifier
   * @returns The updated token record
   */
  async consumePasswordResetToken(id: string): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }
}

/** Singleton repository instance. */
export const userRepository = new UserRepository();
