import { generateSecret, generateURI, verify } from "otplib";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import QRCode from "qrcode";
import type { RegisterBody } from "@repo/shared";
import { userRepository, type FullUser, type UserRepository } from "../repositories/user";
import { ApiError } from "../errors/apiError";

const BCRYPT_ROUNDS = 12;

/**
 * User management service: CRUD, password hashing, MFA setup/enable/disable,
 * TOTP verification, and recovery-code lifecycle.
 *
 * Use the static {@link Instance} factory to create a scoped instance.
 */
export class UserService {
  private readonly repository: UserRepository = userRepository;

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
  async createUser(data: RegisterBody): Promise<FullUser> {
    const username = data.username ?? crypto.randomBytes(8).toString("hex");
    const hashedPassword = await UserService.hashPassword(data.password);

    return this.repository.createUser({
      email: data.email,
      password: hashedPassword,
      username,
    });
  }

  /**
   * Generates a TOTP secret and an `otpauth://` URI for QR-code rendering.
   * The secret is ephemeral — MFA is not active until confirmed.
   */
  generateTOTPSecret(): { secret: string; otpauthUrl: string } {
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: "Secryn",
      label: "user@secryn",
      secret,
    });
    return { secret, otpauthUrl };
  }

  /**
   * Converts an `otpauth://` URI to a base64-encoded PNG QR-code data URL.
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  /**
   * Verifies a 6-digit TOTP code against a stored secret.
   * Returns `false` (not throws) on invalid or unparseable codes.
   */
  async verifyTOTP(token: string, secret: string): Promise<boolean> {
    try {
      const result = await verify({
        secret,
        token,
      });
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Activates MFA for the given user and stores the TOTP secret alongside
   * freshly generated recovery codes. Recovery codes are HMAC-SHA256 hashed
   * with the TOTP secret before being persisted, so the database never holds
   * the raw codes.
   *
   * @returns The raw recovery codes — the caller must present them exactly once.
   */
  async enableMFA(userId: string, secret: string): Promise<string[]> {
    const codes = this.generateRecoveryCodes();

    const hashedCodes = codes.map((code) =>
      crypto.createHmac("sha256", secret).update(code).digest("hex"),
    );

    await this.repository.updateUser(
      { id: userId },
      {
        isMFAEnabled: true,
        mfaSecret: secret,
        mfaRecoveryCodes: {
          createMany: {
            data: hashedCodes.map((code) => ({ code })),
          },
        },
      },
    );

    return codes;
  }

  /**
   * Disables MFA for the given user. The TOTP secret and all recovery codes
   * are permanently discarded.
   */
  async disableMFA(userId: string): Promise<void> {
    await this.repository.deleteRecoveryCodes(userId);
    await this.repository.updateUser(
      { id: userId },
      {
        isMFAEnabled: false,
        mfaSecret: null,
      },
    );
  }

  /**
   * Invalidates all existing recovery codes and generates a fresh set.
   * Returns `null` if MFA is not enabled.
   *
   * @returns The new raw recovery codes, or `null`.
   */
  async regenerateRecoveryCodes(userId: string): Promise<string[] | null> {
    const user = await this.getUserOrThrow({ id: userId });
    if (!user.isMFAEnabled || !user.mfaSecret) return null;

    await this.repository.deleteRecoveryCodes(userId);

    const codes = this.generateRecoveryCodes();
    const hashedCodes = codes.map((code) =>
      crypto.createHmac("sha256", user.mfaSecret!).update(code).digest("hex"),
    );

    await Promise.all(
      hashedCodes.map((code) =>
        this.repository.createRecoveryCode({
          code,
          user: { connect: { id: userId } },
        }),
      ),
    );

    return codes;
  }

  /**
   * Returns placeholder strings (`••••-••••-••••`) for each existing recovery
   * code. Used by the UI to indicate whether codes exist without revealing them.
   */
  async getRecoveryCodePlaceholders(userId: string): Promise<string[]> {
    const user = await this.getUserOrThrow({ id: userId });
    return user.mfaRecoveryCodes.map(() => "••••-••••-••••");
  }

  /**
   * Returns the HMAC hashes of all valid (unused) recovery codes.
   * The raw codes are never recoverable after creation.
   */
  async getRecoveryCodes(userId: string): Promise<string[]> {
    const user = await this.getUserOrThrow({ id: userId });
    return user.mfaRecoveryCodes.filter((c) => c.isValid).map((c) => c.code);
  }

  /**
   * Consumes a single-use recovery code, marking it as invalid.
   *
   * @returns `true` if the code was valid and consumed, `false` otherwise.
   */
  async consumeRecoveryCode(code: string): Promise<boolean> {
    const recoveryCode = await this.repository.findRecoveryCode(code);
    if (!recoveryCode || !recoveryCode.isValid) return false;

    await this.repository.consumeRecoveryCode(recoveryCode.id);
    return true;
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
   * Generates `count` random 12-character uppercase hex recovery codes.
   * The raw codes are returned only at creation time; only their HMAC hashes
   * are persisted.
   */
  private generateRecoveryCodes(count = 10): string[] {
    return Array.from({ length: count }, () => crypto.randomBytes(6).toString("hex").toUpperCase());
  }
}
