import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import { AppError } from "../../../core/errors/appError.js";
import route from "../reset-password.route.js";

const { mockResetPassword, MockAuthService } = vi.hoisted(() => {
  const mockResetPassword = vi.fn();

  function MockAuthService() {
    return { resetPassword: mockResetPassword };
  }
  MockAuthService.Instance = vi.fn().mockResolvedValue({ resetPassword: mockResetPassword });
  return { mockResetPassword, MockAuthService };
});

vi.mock("../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.route(route(app));
  return app;
}

describe("POST /auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true on valid token and password", async () => {
    mockResetPassword.mockResolvedValue({ ok: true });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "valid-reset-token", password: "newpassword123" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("should return 400 when token is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { password: "newpassword123" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "valid-reset-token" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when password is too short", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "valid-reset-token", password: "short" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when body is empty", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when token is invalid or expired", async () => {
    mockResetPassword.mockRejectedValue(
      new AppError("Invalid or expired token", 401, "UNAUTHORIZED"),
    );
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "invalid-token", password: "newpassword123" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockResetPassword.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { token: "valid-reset-token", password: "newpassword123" },
    });

    expect(res.statusCode).toBe(500);
  });
});
