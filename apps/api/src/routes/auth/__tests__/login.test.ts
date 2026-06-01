import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import route from "../login.route.js";

/**
 * Hoisted factory: runs before vi.mock evaluation so mockAuthService is defined
 * when the module-level vi.mock call replaces AuthService in the import graph.
 * Returns a constructor-replacement function that surfaces a controllable mockLogin.
 */
const { mockLogin, MockAuthService } = vi.hoisted(() => {
  const mockLogin = vi.fn();
  /**
   * Replaces AuthService in the route module.
   * Returns an object with a single login method because the route only calls authService.login().
   */
  function MockAuthService() {
    return { login: mockLogin };
  }
  MockAuthService.cookieConfig = {
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "strict" as const,
    maxAge: 1800,
  };
  return { mockLogin, MockAuthService };
});

vi.mock("../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

/**
 * Creates a minimal Fastify instance with cookie parsing and the login route.
 * AJV strict mode is disabled because route schemas omit additionalProperties.
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.route(route(app));
  return app;
}

describe("POST /auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true and set auth cookie on valid credentials", async () => {
    mockLogin.mockResolvedValue("jwt-token-value");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com", password: "correct-password" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]?.name).toBe("auth-token");
    expect(res.cookies[0]?.value).toBe("jwt-token-value");
  });

  it("should return 400 when email is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { password: "some-password" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when body is empty", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when password is incorrect", async () => {
    mockLogin.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com", password: "wrong-password" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 404 when email is not registered", async () => {
    mockLogin.mockRejectedValue(new AppError("User not found", 404, "RESOURCE_NOT_FOUND"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "unknown@test.com", password: "some-password" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockLogin.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "user@test.com", password: "some-password" },
    });

    expect(res.statusCode).toBe(500);
  });
});
