import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../recovery-codes.route.js";

const { mockAuthenticate, mockGetRecoveryCodes, MockUserService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockGetRecoveryCodes = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.getRecoveryCodes = mockGetRecoveryCodes;
  }
  MockUserService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockUserService as unknown as new () => object)());
  return { mockAuthenticate, mockGetRecoveryCodes, MockUserService };
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

describe("GET /auth/mfa/recovery-codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with masked recovery codes when authenticated", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockGetRecoveryCodes.mockResolvedValue(["****", "****", "****"]);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/recovery-codes",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ codes: ["****", "****", "****"] });
  });

  it("should return 200 with empty array when no codes exist", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockGetRecoveryCodes.mockResolvedValue([]);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/recovery-codes",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ codes: [] });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/recovery-codes",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockGetRecoveryCodes.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/recovery-codes",
    });

    expect(res.statusCode).toBe(500);
  });
});
