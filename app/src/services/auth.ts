import { type ForgotPasswordBody, type ResetPasswordBody, logger } from "@repo/shared";
import { UserService } from "./user";
import { ApiError } from "../errors/apiError";
import { EnvUtils } from "../utils/env";
import { getRedis } from "../db/redis";
import crypto from "crypto";
import { EmailUtils } from "../utils/email";
import { readFileSync } from "fs";
import { userRepository } from "../repositories/user";
import type { User } from "@prisma/client";

/**
 * Authentication service orchestrating login, registration, password
 * reset, token refresh, and dual JWT/API-key authentication.
 *
 * Each instance is bound to a specific request so that cookies and headers
 * can be read directly. Use the static {@link Instance} factory to create one.
 */
export class AuthService {
  private constructor(private readonly userService: UserService) {}

  /**
   * Creates (or retrieves) an {@link AuthService} scoped to the given user.
   *
   * @param userId - The authenticated user's ID, or `null` for unauthenticated
   *                 flows (e.g. password reset, email verification).
   */
  static async Instance(userId: string | null): Promise<AuthService> {
    const userService = await UserService.Instance(userId);
    return new AuthService(userService);
  }

  /**
   * Generates a verification token, stores it in Redis (72h TTL), builds
   * a verification URL, and sends an HTML email via the verification
   * template. Failures are fire-and-forget — logged via `logger.error` but
   * never surfaced to the caller.
   *
   * @param to - Recipient email address.
   */
  async sendVerificationEmail(to: string): Promise<void> {
    const emailUtils = new EmailUtils();
    const appUrl = EnvUtils.variables.appUrl;
    const redisClient = getRedis();
    const verificationToken = crypto.randomBytes(32).toString("hex");

    await redisClient.set(`verification:${verificationToken}`, to, "EX", 60 * 60 * 72);

    const verificationUrl = `${appUrl}/verify/${verificationToken}`;

    const template = emailUtils.getTemplate("verification");

    const html = emailUtils.insertVariables(template, {
      VERIFICATION_URL: verificationUrl,
    });

    await emailUtils.sendEmail(to, "Verify your Secryn profile", html);
  }

  /**
   * Marks a user account as verified after validating the token stored in
   * Redis. Once verified the user record is updated and a confirmation
   * email is dispatched.
   *
   * @param id    - The user ID to verify.
   * @param token - The verification token to validate against Redis.
   * @throws {Error} When the user is already verified.
   * @throws {Error} When the token is missing from Redis (invalid or expired).
   */
  async verifyAccount(id: string, token: string): Promise<void> {
    const user = await this.userService.getUserOrThrow({ id });
    if (user.isVerified) throw new Error("User is already verified.");
    const redisClient = getRedis();
    const isValidToken = await redisClient.get(`verification:${token}`);

    if (!isValidToken) {
      throw new Error("Invalid verification token.");
    }

    await this.userService.updateUser(user.id, { isVerified: true });
    const emailUtils = new EmailUtils();
    const html = emailUtils.getTemplate("verifiedAccount");
    await emailUtils.sendEmail(user.email, "Secryn account verified", html);
    await redisClient.del(`verification:${token}`);
  }

  /**
   * Creates a new user account, hashing the password and generating a
   * fallback username if none is provided. On success a verification email is
   * dispatched asynchronously (not awaited — failures are logged but don't
   * block the response).
   *
   * @param data - Registration payload
   * @param data.email    - The user's email address (must be unique)
   * @param data.password - The plain-text password
   * @param data.username - Optional display name
   * @returns The newly created {@link User} record
   * @throws {Error} When the email is already registered or user creation fails
   */
  async register(data: { email: string; password: string; username?: string }): Promise<User> {
    const existingUser = await this.userService.getUser({ email: data.email });
    if (existingUser) throw new Error("User is already registered.");

    const user = await this.userService.createUser(data);
    if (!user) throw new Error("Failed to create user.");

    this.sendVerificationEmail(user.email).catch((err: unknown) => {
      logger.error("[AuthService] Failed to send verification email", {
        email: user.email,
        error: err,
      });
    });

    return user;
  }

  /**
   * Initiates a password-reset flow. Rate-limited to 3 requests per email
   * per 15 minutes via a Redis counter. Whether the email exists or not the
   * response is always `{ ok: true }` to prevent user enumeration.
   *
   * @param data        - Forgot-password payload from the API layer.
   * @param data.email  - The email address entered by the user.
   * @returns Always `{ ok: true }` (anti-enumeration response).
   */
  async forgotPassword(data: ForgotPasswordBody): Promise<{ ok: true }> {
    const redisClient = getRedis();
    const rateLimitKey = `forgot_password:${data.email}`;

    const attempts = Number((await redisClient.get(rateLimitKey)) ?? 0);
    if (attempts >= 3) {
      logger.audit("FORGOT_PASSWORD_BRUTE_FORCE", data.email);
      return { ok: true };
    }

    const user = await this.userService.getUser({ email: data.email });
    if (!user) {
      const pipeline = redisClient.pipeline();
      pipeline.incr(rateLimitKey);
      pipeline.expire(rateLimitKey, 60 * 15);
      await pipeline.exec();
      return { ok: true };
    }

    const token = crypto.randomBytes(32).toString("hex");

    await userRepository.createPasswordResetToken({
      user: { connect: { id: user.id as string } },
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const pipeline = redisClient.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, 60 * 15);
    await pipeline.exec();

    this.sendResetEmail(user.email, token).catch((err: unknown) => {
      logger.error("[AuthService] Failed to send password reset email", {
        email: user.email,
        error: err,
      });
    });

    logger.audit("FORGOT_PASSWORD_REQUESTED", user.email);

    return { ok: true };
  }

  /**
   * Consumes a password-reset token and sets a new hashed password. The
   * token is marked as used immediately so it cannot be replayed.
   *
   * @param data         - Reset-password payload from the API layer.
   * @param data.token   - The reset token from the password-reset URL.
   * @param data.password - The new plain-text password.
   * @returns `{ ok: true }` on success.
   * @throws {ApiError} 401 if the token is invalid, already used, or expired.
   */
  async resetPassword(data: ResetPasswordBody): Promise<{ ok: true }> {
    const resetToken = await userRepository.findPasswordResetToken(data.token);

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw ApiError.Unauthorized("Invalid or expired reset token.");
    }

    const hashedPassword = await UserService.hashPassword(data.password);

    await userRepository.updateUser({ id: resetToken.userId }, { password: hashedPassword });

    await userRepository.consumePasswordResetToken(resetToken.id);

    const user = await this.userService.getUser({ id: resetToken.userId });
    logger.audit("PASSWORD_RESET", user?.email ?? resetToken.userId);

    return { ok: true };
  }

  /**
   * Reads {@code forgotPassword.html} from disk, replaces the template
   * placeholders ({@code {{APP_NAME}}}, {@code {{RESET_URL}}}, {@code {{YEAR}}})
   * with actual values, and sends the resulting HTML via
   * {@link EmailUtils.sendEmail}. Failures are logged but not propagated.
   *
   * @param to    - Recipient email address
   * @param token - The password-reset token embedded in the reset URL
   */
  private async sendResetEmail(to: string, token: string): Promise<void> {
    const emailUtils = new EmailUtils();
    const appUrl = EnvUtils.variables.appUrl;
    const resetUrl = `${appUrl}/reset-password/${token}`;

    const template = readFileSync(`${process.cwd()}/app/src/template/forgotPassword.html`, "utf-8");

    const html = template
      .replaceAll("{{APP_NAME}}", "Secryn")
      .replaceAll("{{RESET_URL}}", resetUrl)
      .replaceAll("{{YEAR}}", String(new Date().getFullYear()));

    await emailUtils.sendEmail(to, "Reset your Secryn password", html);
  }
}
