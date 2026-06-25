import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { userRepository, type FullUser } from "../repositories/user";
import { ApiError } from "../errors/apiError";

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
    data: { username?: string; email?: string; password?: string },
  ): Promise<FullUser> {
    return this.repository.updateUser({ id: userId }, data);
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
}
