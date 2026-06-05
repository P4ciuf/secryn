import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../disable.route.js";

const { mockAuthenticate, mockDisableMFA, MockUserService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockDisableMFA = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.disableMFA = mockDisableMFA;
  }
  MockUserService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockUserService as unknown as new () => object)());
  return { mockAuthenticate, mockDisableMFA, MockUserService };
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

describe("POST /auth/mfa/disable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true when MFA is disabled successfully", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockDisableMFA.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/disable",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/disable",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 409 when MFA is not enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockDisableMFA.mockRejectedValue(new AppError("MFA is not enabled", 409, "CONFLICT"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/disable",
    });

    expect(res.statusCode).toBe(409);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockDisableMFA.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/disable",
    });

    expect(res.statusCode).toBe(500);
  });
});
