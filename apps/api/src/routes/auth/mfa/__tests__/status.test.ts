import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../status.route.js";

const { mockAuthenticate, mockGetUserOrThrow, MockUserService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockGetUserOrThrow = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.getUserOrThrow = mockGetUserOrThrow;
  }
  MockUserService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockUserService as unknown as new () => object)());
  return { mockAuthenticate, mockGetUserOrThrow, MockUserService };
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

describe("GET /auth/mfa/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with enabled: true when MFA is enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockGetUserOrThrow.mockResolvedValue({ isMFAEnabled: true });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/status",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ enabled: true });
  });

  it("should return 200 with enabled: false when MFA is not enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockGetUserOrThrow.mockResolvedValue({ isMFAEnabled: false });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/status",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ enabled: false });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/status",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockGetUserOrThrow.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/status",
    });

    expect(res.statusCode).toBe(500);
  });
});
