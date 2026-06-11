import type { FastifyRequest } from "fastify";
import type {
  RegisterBody,
  LoginBody,
  LoginMFAResponse,
  ForgotPasswordBody,
  ResetPasswordBody,
  ApiKey,
} from "@repo/shared";
import { UserService } from "../../modules/user/service.js";
import { AppError } from "../errors/appError.js";
import { fastifyApp } from "../../lib/fastify.js";
import type { LoggedUser } from "../../types/fastify.js";
import type { CookieSerializeOptions } from "@fastify/cookie";
import { EnvUtils } from "../../utils/env.js";
import { getRedis } from "../../utils/redis.js";
import Redis from "ioredis";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { logger } from "../../core/logger/index.js";
import { ApiKeyService } from "../apiKeys/service.js";
import { userRepository } from "../../modules/user/repository.js";
import { EmailUtils } from "../../utils/email.js";
import { readFileSync } from "node:fs";

/**
 * Payload shape for the short-lived JWT issued during login when MFA is enabled.
 * The client must present this token to the MFA confirm or recovery endpoints
 * within a 2‑minute window to complete authentication.
 */
interface MFATokenPayload {
  mfaPending: true;
  userId: string;
  email: string;
}

/**
 * Central authentication service handling registration, login, MFA challenges,
 * token refresh, and JWT cryptographic verification.
 *
 * Each instance is scoped to a single Fastify request and emits audit-log
 * events for security-relevant actions (login success, login failure,
 * brute-force lockouts).
 */
export class AuthService {
  /**
   * Bcrypt hash of a random UUID, computed once at process startup and reused
   * for all requests. Used to equalise response timing when the requested email
   * does not exist, preventing user-enumeration via timing side-channels.
   */
  private static readonly DUMMY_HASH: Promise<string> = bcrypt.hash(crypto.randomUUID(), 10);

  /** Name of the httpOnly cookie used for JWT transport. */
  static readonly cookieName: string = "auth-token";

  /**
   * Default cookie serialization options for the auth token.
   * The Secure flag is disabled in development to allow plain-HTTP transmission.
   */
  static readonly cookieConfig: CookieSerializeOptions = {
    path: "/",
    httpOnly: true,
    secure: EnvUtils.envVariables().nodeEnv !== "development",
    sameSite: "strict",
    maxAge: 30 * 60, // 30 minutes
  };

  /**
   * @param req         - The current Fastify request, used to inspect cookies
   *                      and the authenticated-user payload.
   * @param userService - Pre-resolved UserService for the authenticated user
   *                      (or a stub for anonymous requests).
   */
  private constructor(
    private readonly req: FastifyRequest,
    private readonly userService: UserService,
  ) {}

  /**
   * Creates an AuthService scoped to the given request by resolving the
   * corresponding UserService instance from the request's user payload.
   *
   * @param req - The incoming Fastify request.
   * @returns   An AuthService bound to the request.
   */
  static async Instance(req: FastifyRequest): Promise<AuthService> {
    const userService = await UserService.Instance(req.user?.id);
    return new AuthService(req, userService);
  }

  /**
   * Signs a JWT containing the user payload with a 30-minute expiration.
   *
   * @param user - The minimal user data to embed in the token.
   * @returns Signed JWT string.
   */
  private generateToken(user: LoggedUser): string {
    return fastifyApp.jwt.sign({ user }, { expiresIn: "30m" });
  }

  /**
   * Signs a short-lived JWT (2 min) indicating that MFA verification is pending.
   * This token must be presented to {@link confirmMFA} or {@link recoverMFA}
   * together with the OTP or recovery code.
   *
   * @param payload - MFA-pending claim set to embed in the token.
   * @returns Signed MFA JWT string.
   */
  private generateMFAToken(payload: MFATokenPayload): string {
    return fastifyApp.jwt.sign(payload, { expiresIn: "2m" });
  }

  /**
   * Verifies the integrity and expiration of the short-lived MFA token
   * issued during login. Throws if the token is malformed, expired, or signed
   * with a different secret.
   *
   * @param token - The raw MFA JWT string from the client.
   * @returns The decoded MFA token payload.
   * @throws {AppError} Unauthorized when the token is invalid or expired.
   */
  private verifyMFAToken(token: string): MFATokenPayload {
    try {
      return fastifyApp.jwt.verify<MFATokenPayload>(token);
    } catch {
      throw AppError.Unauthorized("Invalid or expired MFA token.");
    }
  }

  /**
   * Atomically increments the failed-login counter for the given key and
   * refreshes its TTL to 15 minutes from the last failed attempt.
   *
   * Using a pipeline ensures the INCR and EXPIRE are sent in a single
   * round-trip and are not interleaved with concurrent requests.
   *
   * @param redisClient - The active ioredis client.
   * @param key         - Redis key of the form `failed_login:<email>`.
   */
  private async incrementFailedLogin(redisClient: Redis, key: string): Promise<void> {
    const pipeline = (redisClient as Redis).pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60 * 15);
    await pipeline.exec();
  }

  /**
   * Registers a new user and returns a signed JWT.
   * Rejects if the requester is already authenticated or the email is taken.
   *
   * @param data - The user-creation parameters (email, password, username).
   * @returns JWT for the newly created user.
   * @throws {AppError} Conflict when already logged in or email already registered.
   */
  async register(data: RegisterBody): Promise<string> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");

    const existingUser = await this.userService.getUser({ email: data.email });
    if (existingUser) throw AppError.Conflict("User is already registered.");

    const user = await this.userService.createUser(data);
    if (!user) throw new Error("Failed to create user.");

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Authenticates an existing user by email and password.
   *
   * Strategy:
   *  1. Fast-fail if the brute-force counter has reached its limit.
   *  2. Run a dummy bcrypt comparison when the email is unknown so that the
   *     response time is indistinguishable from a wrong-password response,
   *     preventing user-enumeration via timing side-channels.
   *  3. Increment the counter atomically on every failure (unknown email or
   *     wrong password) with a 15-minute sliding TTL.
   *  4. Clear the counter on success.
   *  5. When MFA is enabled, return a short-lived MFA token instead of the
   *     full auth JWT; the client must complete the OTP challenge via
   *     {@link confirmMFA}.
   *
   * Audit events emitted: {@code LOGIN_BRUTE_FORCE_BLOCKED},
   * {@code LOGIN_FAILED_UNKNOWN_EMAIL}, {@code LOGIN_FAILED},
   * {@code LOGIN_SUCCESS}.
   *
   * @param data - Object containing the user's email and password.
   * @returns Full auth JWT, or an MFA-challenge response.
   * @throws {AppError} Conflict       – already logged in.
   * @throws {AppError} Unauthorized   – too many attempts, or wrong credentials.
   * @throws {AppError} ResourceNotFound – email not registered.
   */
  async login(data: LoginBody): Promise<string | LoginMFAResponse> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");

    const redisClient = getRedis();
    const lockKey = `failed_login:${data.email}`;

    // ① Fast-fail on known attackers before touching the database.
    const failedLoginCount = Number((await redisClient.get(lockKey)) ?? 0);
    if (failedLoginCount >= 3) {
      logger.audit("LOGIN_BRUTE_FORCE_BLOCKED", data.email);
      throw AppError.Unauthorized("Too many failed login attempts. Please try again later.");
    }

    const existingUser = await this.userService.getUser({ email: data.email });

    // ② Unknown email — run a dummy bcrypt round to equalise response timing,
    //    then increment the counter so that email enumeration via repeated
    //    probing is also rate-limited.
    if (!existingUser) {
      await UserService.comparePassword(data.password, await AuthService.DUMMY_HASH);
      await this.incrementFailedLogin(redisClient, lockKey);
      logger.audit("LOGIN_FAILED_UNKNOWN_EMAIL", data.email);
      throw AppError.ResourceNotFound("User");
    }

    const validPassword = await UserService.comparePassword(data.password, existingUser.password);

    // ③ Wrong password — increment before throwing.
    if (!validPassword) {
      await this.incrementFailedLogin(redisClient, lockKey);
      logger.audit("LOGIN_FAILED", data.email);
      throw AppError.Unauthorized("Invalid email or password.");
    }

    // ④ Successful login — clear the brute-force counter.
    await redisClient.del(lockKey);

    const { id, email, username } = existingUser;

    logger.audit("LOGIN_SUCCESS", email);

    if (existingUser.isMFAEnabled) {
      return {
        mfaRequired: true,
        mfaToken: this.generateMFAToken({ mfaPending: true, userId: id, email }),
      };
    }

    return this.generateToken({ id, email, username });
  }

  /**
   * Verifies a TOTP code during login and issues the full auth JWT.
   * The {@link mfaToken} must be the valid short-lived token returned by
   * a preceding {@link login} call.
   *
   * @param token    - The 6-digit TOTP code from the user's authenticator app.
   * @param mfaToken - The short-lived MFA token issued by {@link login}.
   * @returns A signed JWT to set as the auth cookie.
   * @throws {AppError} BadRequest   – MFA not configured on the account.
   * @throws {AppError} Unauthorized – Invalid or expired MFA token / TOTP code.
   */
  async confirmMFA(token: string, mfaToken: string): Promise<string> {
    const payload = this.verifyMFAToken(mfaToken);

    const user = await this.userService.getUserOrThrow({ id: payload.userId });
    if (!user.isMFAEnabled || !user.mfaSecret) {
      throw AppError.BadRequest("MFA is not configured for this account.");
    }

    const isValid = await this.userService.verifyTOTP(token, user.mfaSecret);
    if (!isValid) throw AppError.Unauthorized("Invalid TOTP code.");

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Verifies a backup recovery code during login and issues the full auth JWT.
   * Each recovery code can only be used once.
   *
   * @param code     - The one-time recovery code string.
   * @param mfaToken - The short-lived MFA token issued by {@link login}.
   * @returns A signed JWT to set as the auth cookie.
   * @throws {AppError} BadRequest   – MFA not configured on the account.
   * @throws {AppError} Unauthorized – Invalid, expired, or already-used token/code.
   */
  async recoverMFA(code: string, mfaToken: string): Promise<string> {
    const payload = this.verifyMFAToken(mfaToken);

    const user = await this.userService.getUserOrThrow({ id: payload.userId });
    if (!user.isMFAEnabled) {
      throw AppError.BadRequest("MFA is not configured for this account.");
    }

    const validCode = await this.userService.consumeRecoveryCode(code);
    if (!validCode) {
      throw AppError.Unauthorized("Invalid or already used recovery code.");
    }

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Issues a fresh JWT for the currently authenticated user without
   * re-authentication (silent token renewal).
   *
   * @returns A newly signed JWT for the current user.
   * @throws {AppError} Unauthorized if no user is attached to the request.
   */
  async refreshJWT(): Promise<string> {
    if (!this.req.user) throw AppError.Unauthorized("User is not logged in.");
    return this.generateToken(this.req.user as LoggedUser);
  }

  /**
   * Verifies the JWT signature and expiration, then returns the decoded user.
   * Combines verification and decoding in a single operation so there is no
   * window where an unverified token could be trusted.
   *
   * The auth JWT payload nests the user object under a {@code "user"} key
   * ({@code { user: { id, email, username }, iat, exp }}). This method unwraps
   * that nesting so callers receive a flat {@link LoggedUser}.
   *
   * @since 0.1.0 — Replaces the separate {@link decodeToken} + {@link verifyJWT}
   *                pattern that left a window for unverified tokens.
   * @returns The verified and decoded user payload as a flat {@link LoggedUser}.
   * @throws {AppError} Conflict     – user is already authenticated on the request.
   * @throws {AppError} Unauthorized – token is missing, invalid, or expired.
   */
  private async verifyAndDecodeToken(): Promise<LoggedUser> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");

    const token = this.req.cookies[AuthService.cookieName];
    if (!token) throw AppError.Unauthorized("Missing JWT.");

    try {
      const verified = fastifyApp.jwt.verify<{ user: LoggedUser }>(token);
      return verified.user;
    } catch {
      throw AppError.Unauthorized("Invalid JWT.");
    }
  }

  /**
   * Decodes the JWT from the auth cookie **without** verifying its signature.
   * Only use this when the caller has already verified the token or when
   * the decoded payload is not used for authorization decisions.
   *
   * @returns The decoded user payload as a flat {@link LoggedUser}.
   * @throws {AppError} Conflict     – user is already authenticated on the request.
   * @throws {AppError} Unauthorized – token is missing or cannot be decoded.
   */
  async decodeToken(): Promise<LoggedUser> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");

    const token = this.req.cookies[AuthService.cookieName];
    if (!token) throw AppError.Unauthorized("Missing JWT.");

    try {
      const decoded = fastifyApp.jwt.decode(token);
      return (decoded as { user: LoggedUser }).user;
    } catch {
      throw AppError.Unauthorized("Invalid JWT.");
    }
  }

  /**
   * Verifies the JWT stored in the auth cookie using the server's signing secret.
   * Returns a boolean rather than the decoded payload — prefer
   * {@link verifyAndDecodeToken} when both verification and user data are needed.
   *
   * @returns {@code true} if the token is valid.
   * @throws {AppError} Unauthorized if the token is missing or fails verification.
   * @see {@link verifyAndDecodeToken}
   */
  verifyJWT(): boolean {
    const token = this.req.cookies[AuthService.cookieName];
    if (!token) throw AppError.Unauthorized("Missing JWT.");

    try {
      fastifyApp.jwt.verify(token);
      return true;
    } catch {
      throw AppError.Unauthorized("Invalid JWT.");
    }
  }

  private async verifyWithApiKey(key: string): Promise<ApiKey> {
    const apiKeyService = await ApiKeyService.SystemInstance(key);
    const apiKey = await apiKeyService.getApiKeyByKey(key);
    if (!apiKey) throw AppError.Unauthorized("Invalid API key.");
    return apiKey;
  }

  async authenticateRequest(): Promise<
    (LoggedUser & { type: "USER" }) | (ApiKey & { type: "APIKEY" })
  > {
    const apiKeyHeader = this.req.headers["api-key"] as string;
    if (apiKeyHeader && this.req.url.includes("/secrets")) {
      return { ...(await this.verifyWithApiKey(apiKeyHeader)), type: "APIKEY" };
    }

    const token = this.req.cookies[AuthService.cookieName];
    if (!token) throw AppError.Unauthorized("Missing JWT.");

    try {
      const verified = fastifyApp.jwt.verify<{ user: LoggedUser }>(token);
      return { ...verified.user, type: "USER" };
    } catch {
      throw AppError.Unauthorized("Invalid JWT.");
    }
  }

  /**
   * Initiates a password reset for the given email address.
   *
   * Always returns a success response regardless of whether the email is
   * registered — this prevents user enumeration. If the email exists, a
   * cryptographically random token is generated, persisted with a 1‑hour
   * expiry, and sent to the user's email address.
   *
   * Rate-limited to 3 requests per 15 minutes per email address via Redis.
   *
   * @param data - Contains the user's email address.
   * @returns Always `{ ok: true }`.
   */
  async forgotPassword(data: ForgotPasswordBody) {
    const redisClient = getRedis();
    const rateLimitKey = `forgot_password:${data.email}`;

    const attempts = Number((await redisClient.get(rateLimitKey)) ?? 0);
    if (attempts >= 3) {
      logger.audit("FORGOT_PASSWORD_BRUTE_FORCE", data.email);
      return { ok: true };
    }

    const user = await this.userService.getUser({ email: data.email });
    if (!user) {
      // Unknown email — increment rate limit counter to prevent enumeration
      const pipeline = (redisClient as Redis).pipeline();
      pipeline.incr(rateLimitKey);
      pipeline.expire(rateLimitKey, 60 * 15);
      await pipeline.exec();
      return { ok: true };
    }

    const token = crypto.randomBytes(32).toString("hex");

    await userRepository.createPasswordResetToken({
      user: { connect: { id: user.id } },
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const pipeline = (redisClient as Redis).pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, 60 * 15);
    await pipeline.exec();

    // Send email asynchronously — don't block the response
    this.sendResetEmail(user.email, token).catch((err) => {
      logger.error("[AuthService] Failed to send password reset email", {
        email: user.email,
        error: err,
      });
    });

    logger.audit("FORGOT_PASSWORD_REQUESTED", user.email);

    return { ok: true };
  }

  /**
   * Resets a user's password using a valid reset token.
   *
   * Looks up the token, verifies it has not expired and has not been used,
   * hashes the new password, updates the user, and marks the token as consumed.
   *
   * @param data - Contains the reset token and the new password.
   * @returns `{ ok: true }` on success.
   * @throws {AppError} Unauthorized — token is invalid, expired, or already used.
   */
  async resetPassword(data: ResetPasswordBody) {
    const resetToken = await userRepository.findPasswordResetToken(data.token);

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw AppError.Unauthorized("Invalid or expired reset token.");
    }

    const hashedPassword = await UserService.hashPassword(data.password);

    await userRepository.update({ id: resetToken.userId }, { password: hashedPassword });

    await userRepository.consumePasswordResetToken(resetToken.id);

    const user = await this.userService.getUser({ id: resetToken.userId });
    logger.audit("PASSWORD_RESET", user?.email ?? resetToken.userId);

    return { ok: true };
  }

  private async sendResetEmail(to: string, token: string): Promise<void> {
    const emailUtils = new EmailUtils();
    const appUrl = EnvUtils.envVariables().appUrl;
    const resetUrl = `${appUrl}/reset-password/${token}`;

    const template = readFileSync(
      `${import.meta.dirname}/../../modules/user/email/forgotPassword.html`,
      "utf-8",
    );

    const html = template
      .replaceAll("{{APP_NAME}}", "SecureVault")
      .replaceAll("{{RESET_URL}}", resetUrl);

    await emailUtils.sendEmail(to, "Reset your SecureVault password", html);
  }
}
