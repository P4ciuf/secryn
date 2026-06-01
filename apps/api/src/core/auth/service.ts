import type { FastifyRequest } from "fastify";
import { UserService, type CreateUserParams } from "../../modules/user/service.js";
import { AppError } from "../errors/appError.js";
import { fastifyApp } from "../../lib/fastify.js";
import type { LoggedUser } from "../../types/fastify.js";
import type { CookieSerializeOptions } from "@fastify/cookie";
import { EnvUtils } from "../../utils/env.js";

/**
 * Handles authentication operations: registration, login, token refresh, and JWT verification.
 * Reads the current user from the Fastify request object and issues signed JWTs.
 */
export class AuthService {
  private readonly userService = new UserService();

  /**
   * @param req - The current Fastify request, used to inspect cookies and the authenticated user payload
   */
  constructor(private readonly req: FastifyRequest) {}

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
   * Registers a new user and returns a signed JWT.
   * Rejects if the requester is already authenticated or the email is taken.
   *
   * @param data - The user creation parameters (email, password, username)
   * @returns JWT for the newly created user
   * @throws {AppError} Conflict when already logged in or email already registered
   */
  async register(data: CreateUserParams): Promise<string> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");
    const existingUser = await this.userService.getUser({ email: data.email });
    if (existingUser) throw AppError.Conflict("User is already registered.");

    const user = await this.userService.createUser(data);
    if (!user) throw new Error("Failed to create user");

    const { uuid, email, username } = user;

    return this.generateToken({ uuid, email, username });
  }

  /**
   * Authenticates an existing user by email and password, returns a signed JWT.
   *
   * @param data - Object containing the user's email and password
   * @returns JWT for the authenticated user
   * @throws {AppError} Conflict if already logged in, ResourceNotFound if email is unknown, Unauthorized if password is wrong
   */
  async login(data: Pick<CreateUserParams, "email" | "password">): Promise<string> {
    if (this.req.user) throw AppError.Conflict("User is already logged in.");
    const existingUser = await this.userService.getUser({ email: data.email });
    if (!existingUser) throw AppError.ResourceNotFound("User");

    const validPassword = await UserService.comparePassword(data.password, existingUser.password);
    if (!validPassword) throw AppError.Unauthorized();

    const { uuid, email, username } = existingUser;

    return this.generateToken({ uuid, email, username });
  }

  /**
   * Issues a new JWT for the currently authenticated user without re-authentication.
   *
   * @returns A fresh JWT
   * @throws {AppError} Unauthorized if no user is attached to the request
   */
  async refreshJWT(): Promise<string> {
    if (!this.req.user) throw AppError.Unauthorized("User is not logged in.");
    return this.generateToken(this.req.user as LoggedUser);
  }

  /**
   * Verifies the JWT stored in the "auth-token" cookie.
   * Does not throw on verification failure; that is handled internally.
   *
   * @returns true if the token is valid
   * @throws {AppError} Unauthorized if the token is missing or invalid
   */
  verifyJWT(): boolean {
    const token = this.req.cookies["auth-token"];

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
}
