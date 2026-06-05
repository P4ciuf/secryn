import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import QRCode from "qrcode";
import { AppError } from "../../core/errors/appError.js";
import { userRepository, type FullUser, type SafeUser } from "./repository.js";
import { randomBytes, createHmac } from "node:crypto";
import type { LoggedUser, RegisterBody, UpdateUserInput } from "@repo/shared";
import { logger } from "../../core/logger/index.js";
import { readFileSync } from "node:fs";
import { EnvUtils } from "../../utils/env.js";
import { EmailUtils } from "../../utils/email.js";

const cryptoPlugin = new NobleCryptoPlugin();
const base32Plugin = new ScureBase32Plugin();
const totp = new TOTP({ crypto: cryptoPlugin, base32: base32Plugin });

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
   * Derives a deterministic HMAC-SHA256 hash of a recovery code using the
   * application encryption key as the HMAC secret. The original code is never
   * stored in the database; only this hash is persisted and used for lookups.
   */
  private static hashCode(code: string): string {
    const key = EnvUtils.envVariables().encryptionKey;
    return createHmac("sha256", key).update(code).digest("hex");
  }

  /**
   * Returns a masked placeholder string for a stored code hash.
   * Original codes are not recoverable after storage — this method hides
   * the hash value so the API never leaks even partial code data.
   */
  private static maskHash(_hash: string): string {
    return "****";
  }

  /**
   * Async factory that resolves a user from the database and returns a scoped UserService.
   * When userId is undefined (anonymous request), returns a stub service that can still
   * perform user lookups by email or ID but cannot authorise mutations.
   *
   * @param userId - The authenticated user's ID, or undefined for anonymous requests
   * @returns A UserService instance bound to the resolved user
   * @throws {AppError} ResourceNotFound when userId is provided but the user does not exist
   */
  static async Instance(userId?: string) {
    if (!userId) {
      return new UserService({ id: "", email: "", username: "" });
    }
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

  /**
   * Generates a new TOTP secret and QR code for MFA setup.
   * Does not persist anything yet — the user must confirm with a valid TOTP
   * code via {@code enableMFA} before MFA becomes active.
   *
   * @returns The base32 secret, QR code data URL, and otpauth URL
   */
  async setupMFA(): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    const user = await this.getUserOrThrow({ id: this.user.id });

    if (user.isMFAEnabled) {
      throw AppError.Conflict("MFA is already enabled");
    }

    const secret = totp.generateSecret();
    const otpauthUrl = totp.toURI({ issuer: "SecureVault", label: user.email, secret });
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Store the secret temporarily (not yet active)
    await this.repository.update({ id: this.user.id }, { mfaSecret: secret });

    return { secret, qrCode, otpauthUrl };
  }

  /**
   * Verifies a TOTP token against the stored secret and activates MFA.
   * Generates 10 backup recovery codes, stores them as HMAC‑SHA256 hashes,
   * and returns the plaintext codes (shown once to the user).
   *
   * @param token - The 6-digit TOTP code from the authenticator app
   * @returns The list of plaintext recovery codes for one-time display
   */
  async enableMFA(token: string): Promise<string[]> {
    const user = await this.getUserOrThrow({ id: this.user.id });

    if (user.isMFAEnabled) {
      throw AppError.Conflict("MFA is already enabled");
    }

    if (!user.mfaSecret) {
      throw AppError.BadRequest("MFA setup not initialized. Call setup first.");
    }

    const result = await totp.verify(token, { secret: user.mfaSecret });
    if (!result.valid) {
      throw AppError.Unauthorized("Invalid TOTP code. Please try again.");
    }

    // Delete old recovery codes if any
    await this.repository.deleteMFACodes(user.id);

    // Generate 10 new recovery codes
    const mfaCodes = Array.from({ length: 10 }, () => randomBytes(6).toString("hex"));

    for (const code of mfaCodes) {
      await this.repository.createMFACode({
        code: UserService.hashCode(code),
        user: { connect: { id: user.id } },
      });
    }

    await this.repository.update({ id: this.user.id }, { isMFAEnabled: true });

    await this.sendMFAConfirmationEmail(user.email, true);

    logger.info(`[UserService] MFA enabled for user ${user.id} (${user.email})`);

    return mfaCodes;
  }

  /**
   * Disables MFA on the account, clearing the secret and all recovery codes.
   * Sends a confirmation email.
   */
  async disableMFA(): Promise<void> {
    const user = await this.getUserOrThrow({ id: this.user.id });

    if (!user.isMFAEnabled) {
      throw AppError.Conflict("MFA is not enabled");
    }

    await this.repository.deleteMFACodes(user.id);
    await this.repository.update({ id: this.user.id }, { isMFAEnabled: false, mfaSecret: null });

    await this.sendMFAConfirmationEmail(user.email, false);

    logger.info(`[UserService] MFA disabled for user ${user.id} (${user.email})`);
  }

  /**
   * Verifies a TOTP token against the user's stored secret.
   * Used during login when MFA is already active.
   *
   * @param token - The 6-digit TOTP code
   * @param secret - The user's stored base32 TOTP secret
   * @returns True if the token is valid
   */
  async verifyTOTP(token: string, secret: string): Promise<boolean> {
    const result = await totp.verify(token, { secret });
    return result.valid;
  }

  /**
   * Hashes the user-supplied code with HMAC‑SHA256, looks it up, and
   * marks it as consumed. Each code is single-use and cannot be reused.
   *
   * @param code - The plaintext recovery code entered by the user
   * @returns The updated MFARecoveryCode, or null if not found or already consumed
   */
  async consumeRecoveryCode(code: string) {
    const hash = UserService.hashCode(code);
    const existing = await this.repository.findMFACode(hash);
    if (!existing || !existing.isValid) {
      return null;
    }
    return this.repository.consumeMFACode(hash);
  }

  /**
   * Returns masked placeholders for all valid recovery codes of the
   * current user. Original codes are never stored in plaintext and
   * cannot be recovered after the initial setup or regeneration.
   */
  async getRecoveryCodes(): Promise<string[]> {
    const codes = await this.repository.getValidRecoveryCodes(this.user.id);
    return codes.map((c) => UserService.maskHash(c.code));
  }

  /**
   * Regenerates recovery codes: deletes all existing codes, generates 10 new
   * ones, stores their HMAC‑SHA256 hashes, and returns the plaintext codes
   * for one-time display. Old codes become invalid immediately.
   */
  async regenerateRecoveryCodes(): Promise<string[]> {
    const user = await this.getUserOrThrow({ id: this.user.id });

    if (!user.isMFAEnabled) {
      throw AppError.Conflict("MFA is not enabled");
    }

    await this.repository.deleteMFACodes(user.id);

    const mfaCodes = Array.from({ length: 10 }, () => randomBytes(6).toString("hex"));

    for (const code of mfaCodes) {
      await this.repository.createMFACode({
        code: UserService.hashCode(code),
        user: { connect: { id: user.id } },
      });
    }

    return mfaCodes;
  }

  /**
   * Sends a backup code email via the existing Resend mailer.
   */
  async sendBackupCodeEmail(code: string): Promise<void> {
    const user = await this.getUserOrThrow({ id: this.user.id });
    const emailUtils = new EmailUtils();

    const template = readFileSync(`${import.meta.dirname}/email/mfaBackupCode.html`, "utf-8");

    const html = template
      .replaceAll("{{CODE}}", code)
      .replaceAll("{{APP_NAME}}", "SecureVault")
      .replaceAll("{{YEAR}}", String(new Date().getFullYear()));

    await emailUtils.sendEmail(user.email, "Your SecureVault Backup Code", html);
  }

  /**
   * Sends a confirmation email when MFA is enabled or disabled.
   */
  private async sendMFAConfirmationEmail(to: string, enabled: boolean): Promise<void> {
    const emailUtils = new EmailUtils();
    const templatePath = enabled
      ? `${import.meta.dirname}/email/mfaEnabled.html`
      : `${import.meta.dirname}/email/mfaDisabled.html`;

    const template = readFileSync(templatePath, "utf-8");

    const html = template
      .replaceAll("{{APP_NAME}}", "SecureVault")
      .replaceAll("{{APP_URL}}", EnvUtils.envVariables().appUrl)
      .replaceAll("{{YEAR}}", String(new Date().getFullYear()));

    const subject = enabled
      ? "Two-factor authentication enabled"
      : "Two-factor authentication disabled";

    await emailUtils.sendEmail(to, subject, html);
  }

  // Kept for internal compatibility; replaced by the TOTP flow above.
  async activeMFA() {
    const user = await this.getUserOrThrow({ id: this.user.id });

    if (user.isMFAEnabled) {
      throw AppError.Conflict("MFA is already enabled");
    }

    const mfaCodes = Array.from({ length: 10 }, () => randomBytes(6).toString("hex"));

    for (const code of mfaCodes) {
      await this.repository.createMFACode({
        code: UserService.hashCode(code),
        user: { connect: { id: user.id } },
      });
    }

    const fileContent = mfaCodes.join("\n");

    await this.repository.update({ id: this.user.id }, { isMFAEnabled: true });

    return Buffer.from(fileContent, "utf-8");
  }
}
