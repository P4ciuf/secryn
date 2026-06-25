import { type ForgotPasswordBody, type ResetPasswordBody, logger } from "@repo/shared";
import { UserService } from "./user";
import { ApiError } from "../errors/apiError";
import { EnvUtils } from "../utils/env";
import { getRedis } from "../db/redis";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { EmailUtils } from "../utils/email";
import { readFileSync } from "node:fs";
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
  /**
   * A pre-computed bcrypt hash used as a dummy comparison target when a
   * login attempt references an email that does not exist. This keeps the
   * response time constant to prevent user enumeration via timing.
   */
  private static readonly DUMMY_HASH: Promise<string> = bcrypt.hash(crypto.randomUUID(), 10);

  private constructor(private readonly userService: UserService) {}

  static async Instance(userId: string | null): Promise<AuthService> {
    const userService = await UserService.Instance(userId);
    return new AuthService(userService);
  }

  async register(data: { email: string; password: string; username?: string }): Promise<User> {
    const existingUser = await this.userService.getUser({ email: data.email });
    if (existingUser) throw new Error("User is already registered.");

    const user = await this.userService.createUser(data);
    if (!user) throw new Error("Failed to create user.");

    return user;
  }

  /**
   * Initiates a password-reset flow. Rate-limited to 3 requests per email
   * per 15 minutes. If the email exists, a reset token is generated and
   * emailed. The response is identical whether the email exists or not to
   * prevent user enumeration.
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
   * @throws 401 if the token is invalid, already used, or expired.
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
