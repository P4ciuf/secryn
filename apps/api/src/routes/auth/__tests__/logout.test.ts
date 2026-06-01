import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import route from "../logout.route.js";

/**
 * Hoisted factory: runs before vi.mock evaluation so mockAuthenticate and
 * MockAuthService are defined when the module-level vi.mock call replaces
 * AuthService in the import graph.
 * MockAuthService is empty because the logout route only uses static properties
 * (cookieConfig) and the preHandler's authenticate decorator.
 */
const { mockAuthenticate, MockAuthService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  function MockAuthService() {}
  MockAuthService.cookieConfig = {
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "strict" as const,
    maxAge: 1800,
  };
  return { mockAuthenticate, MockAuthService };
});

vi.mock("../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

/**
 * Creates a minimal Fastify instance with cookie parsing, the authenticate
 * decorator mocked, and the logout route registered.
 * The authenticate mock lets each test control whether the request passes
 * auth (mockImplementation) or fails (mockRejectedValue).
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("POST /auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true and clear auth cookie when authenticated", async () => {
    // Simulate a successful auth: attach a fake user to the request
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { uuid: "test-uuid", email: "user@test.com", username: "testuser" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]?.name).toBe("auth-token");
    expect(res.cookies[0]?.value).toBe("");
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when authentication check fails unexpectedly", async () => {
    mockAuthenticate.mockRejectedValue(new Error("Auth service unavailable"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });

    expect(res.statusCode).toBe(500);
  });
});
