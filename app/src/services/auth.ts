import {
  type RegisterBody,
  type LoginBody,
  type LoginMFAResponse,
  type ForgotPasswordBody,
  type ResetPasswordBody,
  type LoggedUser,
  type ApiKey,
  logger,
} from "@repo/shared";
import type { SerializeOptions } from "cookie";
import { UserService } from "./user";
import { ApiError } from "../errors/apiError";
import { EnvUtils } from "../utils/env";
import { getRedis } from "../db/redis";
import Redis from "ioredis";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { ApiKeyService } from "./apiKey";
import { EmailUtils } from "../utils/email";
import { readFileSync } from "node:fs";
import { signJwt, signPayloadJwt, verifyJwt, decodeJwt } from "./jwt";
import { userRepository } from "../repositories/user";

interface MFATokenPayload {
  mfaPending: boolean;
  userId: string;
  email: string;
}

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Authentication service orchestrating login, registration, MFA, password
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

  /** Name of the httpOnly cookie that carries the JWT. */
  static readonly cookieName: string = "auth-token";

  /**
   * Cookie serialization options: httpOnly, Strict same-site, secure in
   * production, 30-minute max-age.
   */
  static readonly cookieConfig: SerializeOptions = {
    path: "/",
    httpOnly: true,
    secure: EnvUtils.variables.nodeEnv !== "development",
    sameSite: "strict",
    maxAge: 30 * 60,
  };

  private constructor(
    private readonly request: Request,
    private readonly userService: UserService,
  ) {}

  static async Instance(request: Request, userId: string | null): Promise<AuthService> {
    const userService = await UserService.Instance(userId);
    return new AuthService(request, userService);
  }

  private async generateToken(user: LoggedUser): Promise<string> {
    return signJwt(user, "30m");
  }

  private async generateMFAToken(payload: MFATokenPayload): Promise<string> {
    return signPayloadJwt(payload as unknown as Record<string, unknown>, "2m");
  }

  private async verifyMFAToken(token: string): Promise<MFATokenPayload> {
    try {
      return await verifyJwt<MFATokenPayload>(token);
    } catch {
      throw ApiError.Unauthorized("Invalid or expired MFA token.");
    }
  }

  private async incrementFailedLogin(redisClient: Redis, key: string): Promise<void> {
    const pipeline = redisClient.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60 * 15);
    await pipeline.exec();
  }

  /**
   * Creates a new user account and returns a JWT. The caller is expected to
   * set the cookie and redirect.
   *
   * @throws 409 if the email is already registered.
   */
  async register(data: RegisterBody): Promise<string> {
    const existingUser = await this.userService.getUser({ email: data.email });
    if (existingUser) throw ApiError.Conflict("User is already registered.");

    const user = await this.userService.createUser(data);
    if (!user) throw new Error("Failed to create user.");

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Authenticates a user with email and password. Enforces a Redis-backed
   * rate limit of 3 failed attempts per email (15-minute window). Unknown
   * emails go through the same bcrypt comparison path to prevent timing
   * attacks.
   *
   * @returns A JWT string, or a {@link LoginMFAResponse} if MFA is required.
   */
  async login(data: LoginBody): Promise<string | LoginMFAResponse> {
    const redisClient = getRedis();
    const lockKey = `failed_login:${data.email}`;

    const failedLoginCount = Number((await redisClient.get(lockKey)) ?? 0);
    if (failedLoginCount >= 3) {
      logger.audit("LOGIN_BRUTE_FORCE_BLOCKED", data.email);
      throw ApiError.Unauthorized("Too many failed login attempts. Please try again later.");
    }

    const existingUser = await this.userService.getUser({ email: data.email });

    if (!existingUser) {
      await UserService.comparePassword(data.password, await AuthService.DUMMY_HASH);
      await this.incrementFailedLogin(redisClient, lockKey);
      logger.audit("LOGIN_FAILED_UNKNOWN_EMAIL", data.email);
      throw ApiError.ResourceNotFound("User");
    }

    const validPassword = await UserService.comparePassword(data.password, existingUser.password);

    if (!validPassword) {
      await this.incrementFailedLogin(redisClient, lockKey);
      logger.audit("LOGIN_FAILED", data.email);
      throw ApiError.Unauthorized("Invalid email or password.");
    }

    await redisClient.del(lockKey);

    const { id, email, username } = existingUser;

    logger.audit("LOGIN_SUCCESS", email);

    if (existingUser.isMFAEnabled) {
      return {
        mfaRequired: true,
        mfaToken: await this.generateMFAToken({
          mfaPending: true,
          userId: id,
          email,
        }),
      };
    }

    return this.generateToken({ id, email, username });
  }

  /**
   * Completes the MFA step of login by verifying a TOTP code against the
   * user's stored secret.
   *
   * @param token    - The temporary MFA token from the login response.
   * @param mfaToken - The 6-digit TOTP code from the authenticator app.
   * @returns A full JWT for the authenticated session.
   */
  async confirmMFA(token: string, mfaToken: string): Promise<string> {
    const payload = await this.verifyMFAToken(mfaToken);

    const user = await this.userService.getUserOrThrow({ id: payload.userId });
    if (!user.isMFAEnabled || !user.mfaSecret) {
      throw ApiError.BadRequest("MFA is not configured for this account.");
    }

    const isValid = await this.userService.verifyTOTP(token, user.mfaSecret);
    if (!isValid) throw ApiError.Unauthorized("Invalid TOTP code.");

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Completes the MFA step using a single-use recovery code instead of a
   * TOTP code. The consumed code is invalidated immediately.
   */
  async recoverMFA(code: string, mfaToken: string): Promise<string> {
    const payload = await this.verifyMFAToken(mfaToken);

    const user = await this.userService.getUserOrThrow({ id: payload.userId });
    if (!user.isMFAEnabled) {
      throw ApiError.BadRequest("MFA is not configured for this account.");
    }

    const validCode = await this.userService.consumeRecoveryCode(code);
    if (!validCode) {
      throw ApiError.Unauthorized("Invalid or already used recovery code.");
    }

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Issues a fresh JWT by re-verifying the current token from the cookie.
   * Used to extend a session without prompting for credentials.
   */
  async refreshToken(): Promise<string> {
    const token = getCookie(this.request, AuthService.cookieName);
    if (!token) throw ApiError.Unauthorized("User is not logged in.");

    try {
      const verified = await verifyJwt<{ user: LoggedUser }>(token);
      return this.generateToken(verified.user);
    } catch {
      throw ApiError.Unauthorized("Invalid JWT.");
    }
  }

  /**
   * Verifies and decodes the JWT from the request cookie. Used by server-side
   * auth guards that need the full user payload.
   */
  async verifyAndDecodeToken(): Promise<LoggedUser> {
    const token = getCookie(this.request, AuthService.cookieName);
    if (!token) throw ApiError.Unauthorized("Missing JWT.");

    try {
      const verified = await verifyJwt<{ user: LoggedUser }>(token);
      return verified.user;
    } catch {
      throw ApiError.Unauthorized("Invalid JWT.");
    }
  }

  /**
   * Decodes the JWT without cryptographic verification. Useful when the
   * token has already been verified (e.g. by middleware) but the payload is
   * still needed.
   */
  async decodeToken(): Promise<LoggedUser> {
    const token = getCookie(this.request, AuthService.cookieName);
    if (!token) throw ApiError.Unauthorized("Missing JWT.");

    const decoded = decodeJwt<{ user: LoggedUser }>(token);
    if (!decoded) throw ApiError.Unauthorized("Invalid JWT.");
    return decoded.user;
  }

  /**
   * Checks that a JWT cookie is present on the request. Does not verify the
   * token cryptographically — use {@link verifyAndDecodeToken} for that.
   */
  verifyJWT(): boolean {
    const token = getCookie(this.request, AuthService.cookieName);
    if (!token) throw ApiError.Unauthorized("Missing JWT.");
    return true;
  }

  private async verifyWithApiKey(key: string): Promise<ApiKey> {
    const apiKeyService = await ApiKeyService.SystemInstance(key);
    const apiKey = await apiKeyService.getApiKeyByKey(key);
    if (!apiKey) throw ApiError.Unauthorized("Invalid API key.");
    return apiKey;
  }

  /**
   * Authenticates the current request via JWT cookie or API key header.
   * The `api-key` header takes precedence for requests to `/secrets`
   * endpoints. Returns a discriminated union so callers can distinguish
   * user sessions from API key access.
   */
  async authenticateRequest(): Promise<
    (LoggedUser & { type: "USER" }) | (ApiKey & { type: "APIKEY" })
  > {
    const apiKeyHeader = this.request.headers.get("api-key");
    if (apiKeyHeader && this.request.url.includes("/secrets")) {
      return { ...(await this.verifyWithApiKey(apiKeyHeader)), type: "APIKEY" };
    }

    const token = getCookie(this.request, AuthService.cookieName);
    if (!token) throw ApiError.Unauthorized("Missing JWT.");

    try {
      const verified = await verifyJwt<{ user: LoggedUser }>(token);
      return { ...verified.user, type: "USER" };
    } catch {
      throw ApiError.Unauthorized("Invalid JWT.");
    }
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
      user: { connect: { id: user.id } },
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
