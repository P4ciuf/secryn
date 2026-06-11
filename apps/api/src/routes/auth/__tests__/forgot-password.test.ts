import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import { AppError } from "../../../core/errors/appError.js";
import route from "../forgot-password.route.js";

const { mockForgotPassword, MockAuthService } = vi.hoisted(() => {
  const mockForgotPassword = vi.fn();

  function MockAuthService() {
    return { forgotPassword: mockForgotPassword };
  }
  MockAuthService.Instance = vi.fn().mockResolvedValue({ forgotPassword: mockForgotPassword });
  return { mockForgotPassword, MockAuthService };
});

vi.mock("../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.route(route(app));
  return app;
}

describe("POST /auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true on valid email", async () => {
    mockForgotPassword.mockResolvedValue({ ok: true });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "user@test.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("should return 200 with ok:true even for unknown emails", async () => {
    mockForgotPassword.mockResolvedValue({ ok: true });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "unknown@test.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("should return 400 when email is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when body is empty", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when email format is invalid", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "not-an-email" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockForgotPassword.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "user@test.com" },
    });

    expect(res.statusCode).toBe(500);
  });
});
