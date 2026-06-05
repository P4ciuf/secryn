import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../enable.route.js";

const { mockAuthenticate, mockEnableMFA, MockUserService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockEnableMFA = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.enableMFA = mockEnableMFA;
  }
  MockUserService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockUserService as unknown as new () => object)());
  return { mockAuthenticate, mockEnableMFA, MockUserService };
});

vi.mock("../../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

const recoveryCodes = ["a1b2c3d4e5f6", "b2c3d4e5f6a1", "c3d4e5f6a1b2"];

describe("POST /auth/mfa/enable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with recoveryCodes on valid TOTP token", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockEnableMFA.mockResolvedValue(recoveryCodes);
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/enable",
      payload: { token: "123456" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ recoveryCodes });
  });

  it("should return 400 when token is missing from body", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/enable",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/enable",
      payload: { token: "123456" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 401 when TOTP token is invalid", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockEnableMFA.mockRejectedValue(
      new AppError("Invalid TOTP code. Please try again.", 401, "UNAUTHORIZED"),
    );
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/enable",
      payload: { token: "000000" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 409 when MFA is already enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockEnableMFA.mockRejectedValue(new AppError("MFA is already enabled", 409, "CONFLICT"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/enable",
      payload: { token: "123456" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockEnableMFA.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/enable",
      payload: { token: "123456" },
    });

    expect(res.statusCode).toBe(500);
  });
});
