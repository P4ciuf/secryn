import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../regenerate-codes.route.js";

const { mockAuthenticate, mockRegenerateRecoveryCodes, MockUserService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockRegenerateRecoveryCodes = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.regenerateRecoveryCodes = mockRegenerateRecoveryCodes;
  }
  MockUserService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockUserService as unknown as new () => object)());
  return { mockAuthenticate, mockRegenerateRecoveryCodes, MockUserService };
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

const newCodes = ["f6e5d4c3b2a1", "e5d4c3b2a1f6", "d4c3b2a1f6e5"];

describe("POST /auth/mfa/recovery-codes/regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with new codes when MFA is enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockRegenerateRecoveryCodes.mockResolvedValue(newCodes);
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery-codes/regenerate",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ codes: newCodes });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery-codes/regenerate",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 409 when MFA is not enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockRegenerateRecoveryCodes.mockRejectedValue(
      new AppError("MFA is not enabled", 409, "CONFLICT"),
    );
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery-codes/regenerate",
    });

    expect(res.statusCode).toBe(409);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockRegenerateRecoveryCodes.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery-codes/regenerate",
    });

    expect(res.statusCode).toBe(500);
  });
});
