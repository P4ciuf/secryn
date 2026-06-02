import type { Prisma, User } from "@prisma/client";
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
   * @returns The full user with relations, or null if not found
   */
  async find(where: Prisma.UserWhereInput): Promise<FullUser | null> {
    return prisma.user.findFirst({ where, include: this.userInclude });
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
}

/** Singleton repository instance. */
export const userRepository = new UserRepository();
