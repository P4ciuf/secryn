import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import route from "../register.route.js";

/**
 * Hoisted factory: runs before vi.mock evaluation so mockRegister and
 * MockAuthService are defined when the module-level vi.mock call replaces
 * AuthService in the import graph.
 * MockAuthService returns an object with a register method because the route
 * only calls authService.register().
 */
const { mockRegister, MockAuthService } = vi.hoisted(() => {
  const mockRegister = vi.fn();
  function MockAuthService() {
    return { register: mockRegister };
  }
  MockAuthService.Instance = vi.fn().mockResolvedValue({ register: mockRegister });
  MockAuthService.cookieConfig = {
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "strict" as const,
    maxAge: 1800,
  };
  return { mockRegister, MockAuthService };
});

vi.mock("../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

/**
 * Creates a minimal Fastify instance with cookie parsing and the register route.
 * AJV strict mode is disabled because route schemas omit additionalProperties.
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.route(route(app));
  return app;
}

describe("POST /auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true and set auth cookie on new registration", async () => {
    mockRegister.mockResolvedValue("jwt-token-value");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@test.com", password: "strong-pass-123", username: "newuser" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]?.name).toBe("auth-token");
  });

  it("should return 200 when username is omitted (auto-generated fallback)", async () => {
    mockRegister.mockResolvedValue("jwt-token-value");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@test.com", password: "strong-pass-123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("should return 400 when email is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { password: "strong-pass-123", username: "newuser" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@test.com", username: "newuser" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when body is empty", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 409 when email is already registered", async () => {
    mockRegister.mockRejectedValue(new AppError("User already exists", 409, "CONFLICT"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "existing@test.com", password: "strong-pass-123" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockRegister.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "new@test.com", password: "strong-pass-123" },
    });

    expect(res.statusCode).toBe(500);
  });
});
