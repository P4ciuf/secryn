import type { FastifyRequest } from "fastify";
import type { RegisterBody, LoginBody, LoginMFAResponse } from "@repo/shared";
import { UserService } from "../../modules/user/service.js";
import { AppError } from "../errors/appError.js";
import { fastifyApp } from "../../lib/fastify.js";
import type { LoggedUser } from "../../types/fastify.js";
import type { CookieSerializeOptions } from "@fastify/cookie";
import { EnvUtils } from "../../utils/env.js";

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
 * AuthService handles user registration, login, token refresh, and JWT verification.
 * Each instance is scoped to a single Fastify request, allowing access to cookies and the authenticated user.
 */
export class AuthService {
  /**
   * @param req - The current Fastify request, used to inspect cookies and the authenticated user payload
   * @param userService - Pre-resolved UserService for the authenticated user (or a stub for anonymous requests)
   */
  private constructor(
    private readonly req: FastifyRequest,
    private readonly userService: UserService,
  ) {}

  /**
   * Creates an AuthService scoped to the given request by resolving the
   * corresponding UserService instance from the request's user payload.
   *
   * @param req - The incoming Fastify request
   * @returns An AuthService bound to the request
   */
  static async Instance(req: FastifyRequest): Promise<AuthService> {
    const userService = await UserService.Instance(req.user?.id);
    return new AuthService(req, userService);
  }

  /**
   * Signs a JWT containing the user payload with a 30-minute expiration.
   *
   * @param user - The minimal user data to embed in the token
   * @returns Signed JWT string
   */
  private generateToken(user: LoggedUser): string {
    return fastifyApp.jwt.sign({ user }, { expiresIn: "30m" });
  }

  /**
   * Signs a short-lived JWT (2 min) that indicates MFA verification is pending.
   * This token must be presented to {@code confirmMFA} or {@code recoverMFA}
   * along with the OTP or recovery code.
   */
  private generateMFAToken(payload: MFATokenPayload): string {
    return fastifyApp.jwt.sign(payload, { expiresIn: "2m" });
  }

  /**
   * Verifies the integrity and expiration of the short-lived MFA token
   * issued during login. Throws an Unauthorized error if the token is
   * malformed, has expired, or was signed with a different secret.
   *
   * @param token - The raw MFA JWT string from the client
   * @returns The decoded MFA token payload
   * @throws {AppError} Unauthorized when the token is invalid or expired
   */
  private verifyMFAToken(token: string): MFATokenPayload {
    try {
      return fastifyApp.jwt.verify<MFATokenPayload>(token);
    } catch {
      throw AppError.Unauthorized("Invalid or expired MFA token");
    }
  }

  /**
   * Registers a new user and returns a signed JWT.
   * Rejects if the requester is already authenticated or the email is taken.
   *
   * @param data - The user creation parameters (email, password, username)
   * @returns JWT for the newly created user
   * @throws {AppError} Conflict when already logged in or email already registered
   */
  async register(data: RegisterBody): Promise<string> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");
    const existingUser = await this.userService.getUser({ email: data.email });
    if (existingUser) throw AppError.Conflict("User is already registered.");

    const user = await this.userService.createUser(data);
    if (!user) throw new Error("Failed to create user");

    const { id, email, username } = user;

    return this.generateToken({ id, email, username });
  }

  /**
   * Authenticates an existing user by email and password.
   * When MFA is enabled on the account, returns a short-lived MFA token
   * instead of setting the auth cookie. The client must then complete
   * the OTP challenge via {@code /auth/mfa/confirm}.
   *
   * @param data - Object containing the user's email and password
   * @returns JWT for the authenticated user, or MFA challenge response
   * @throws {AppError} Conflict if already logged in, ResourceNotFound if email is unknown, Unauthorized if password is wrong
   */
  async login(data: LoginBody): Promise<string | LoginMFAResponse> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");
    const existingUser = await this.userService.getUser({ email: data.email });
    if (!existingUser) throw AppError.ResourceNotFound("User");

    const validPassword = await UserService.comparePassword(data.password, existingUser.password);
    if (!validPassword) throw AppError.Unauthorized();

    const { id, email, username } = existingUser;

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
   * The mfaToken must be a valid short-lived token from a preceding login call.
   *
   * @param token - The 6-digit TOTP code from the user's authenticator app
   * @param mfaToken - The short-lived MFA token returned by the login endpoint
   * @returns A signed JWT for setting as the auth cookie
   */
  async confirmMFA(token: string, mfaToken: string): Promise<string> {
    const payload = this.verifyMFAToken(mfaToken);

    const user = await this.userService.getUserOrThrow({ id: payload.userId });
    if (!user.isMFAEnabled || !user.mfaSecret) {
      throw AppError.BadRequest("MFA is not configured for this account");
    }

    const isValid = await this.userService.verifyTOTP(token, user.mfaSecret);
    if (!isValid) throw AppError.Unauthorized("Invalid TOTP code");

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Verifies a backup recovery code during login and issues the full auth JWT.
   * Each recovery code can only be used once.
   *
   * @param code - The recovery code string
   * @param mfaToken - The short-lived MFA token returned by the login endpoint
   * @returns A signed JWT for setting as the auth cookie
   */
  async recoverMFA(code: string, mfaToken: string): Promise<string> {
    const payload = this.verifyMFAToken(mfaToken);

    const user = await this.userService.getUserOrThrow({ id: payload.userId });
    if (!user.isMFAEnabled) {
      throw AppError.BadRequest("MFA is not configured for this account");
    }

    const validCode = await this.userService.consumeRecoveryCode(code);
    if (!validCode) throw AppError.Unauthorized("Invalid or already used recovery code");

    const { id, email, username } = user;
    return this.generateToken({ id, email, username });
  }

  /**
   * Issues a new JWT for the currently authenticated user without re-authentication.
   *
   * @returns A newly signed JWT for the currently authenticated user
   * @throws {AppError} Unauthorized if no user is attached to the request
   */
  async refreshJWT(): Promise<string> {
    if (!this.req.user) throw AppError.Unauthorized("User is not logged in.");
    return this.generateToken(this.req.user as LoggedUser);
  }

  /**
   * Decodes the JWT from the "auth-token" cookie without verifying its signature.
   * Useful for pre-authentication checks where the full verify/handle flow is unwanted.
   *
   * The auth JWT payload nests the user object under a "user" key
   * (e.g. `{ user: { id, email, username }, iat, exp }`). This method
   * unwraps that nesting so callers receive a flat {@link LoggedUser}.
   *
   * @returns The decoded user payload as a flat {@link LoggedUser}
   * @throws {AppError} Conflict if the user is already authenticated via the request
   * @throws {AppError} Unauthorized if the token is missing or cannot be decoded
   */
  async decodeToken(): Promise<LoggedUser> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");
    const token = this.req.cookies[AuthService.cookieName];

    if (!token) {
      throw AppError.Unauthorized("Missing JWT");
    }

    try {
      const decodedToken = fastifyApp.jwt.decode(token);
      return (decodedToken as { user: LoggedUser }).user;
    } catch {
      throw AppError.Unauthorized("Invalid JWT");
    }
  }

  /**
   * Verifies the JWT stored in the "auth-token" cookie using the server's secret.
   *
   * @returns true if the token is valid
   * @throws {AppError} Unauthorized if the token is missing or invalid
   */
  verifyJWT(): boolean {
    const token = this.req.cookies[AuthService.cookieName];

    if (!token) {
      throw AppError.Unauthorized("Missing JWT");
    }

    try {
      fastifyApp.jwt.verify(token);
      return true;
    } catch {
      throw AppError.Unauthorized("Invalid JWT");
    }
  }

  /**
   * Default cookie serialization options for the auth token.
   * Secure flag is disabled in development to allow HTTP transmission.
   */
  static cookieConfig: CookieSerializeOptions = {
    path: "/",
    httpOnly: true,
    secure: EnvUtils.envVariables().nodeEnv !== "development",
    sameSite: "strict",
    maxAge: 30 * 60, // 30 minutes
  };

  /** Name of the httpOnly cookie used for JWT transport. */
  static cookieName: string = "auth-token";
}
