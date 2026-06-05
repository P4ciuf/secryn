import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import route from "../refresh.route.js";

const { mockAuthenticate, mockRefreshJWT, MockAuthService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockRefreshJWT = vi.fn();
  function MockAuthService(this: Record<string, unknown>) {
    this.refreshJWT = mockRefreshJWT;
  }
  MockAuthService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockAuthService as unknown as new () => object)());
  MockAuthService.cookieConfig = {
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "strict" as const,
    maxAge: 1800,
  };
  return { mockAuthenticate, mockRefreshJWT, MockAuthService };
});

vi.mock("../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("POST /auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true and set a new auth cookie when authenticated", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockRefreshJWT.mockResolvedValue("new-jwt-token");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]?.name).toBe("auth-token");
    expect(res.cookies[0]?.value).toBe("new-jwt-token");
    expect(mockRefreshJWT).toHaveBeenCalledOnce();
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockRefreshJWT.mockRejectedValue(new Error("JWT signing failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
    });

    expect(res.statusCode).toBe(500);
  });
});
