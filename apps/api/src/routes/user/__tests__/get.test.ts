import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../get.route.js";

const { mockGetUserSafe, mockAuthenticate, MockUserService } = vi.hoisted(() => {
  const mockGetUserSafe = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockUserService(
    this: { getUserSafe: typeof mockGetUserSafe },
    _user: { id: string; email: string; username: string },
  ) {
    this.getUserSafe = mockGetUserSafe;
  }
  MockUserService.Instance = async (userId: string) => new (MockUserService as any)({ id: userId });
  return { mockGetUserSafe, mockAuthenticate, MockUserService };
});

vi.mock("../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

/**
 * Boots a minimal Fastify instance with cookie parsing, error handling,
 * a mocked authenticate decorator, and the get-user route under test.
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

const now = new Date().toISOString();

const mockUser = {
  id: "user_001",
  email: "john@example.com",
  username: "John Doe",
  role: "admin",
  createdAt: now,
  updatedAt: now,
};

describe("GET /users/:userId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with the user when fetching by @me", async () => {
    mockGetUserSafe.mockResolvedValue(mockUser);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/@me",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockUser);
    expect(mockGetUserSafe).toHaveBeenCalledWith({ id: "user_001" });
  });

  it("should return 200 with the user when fetching by regular ID", async () => {
    mockGetUserSafe.mockResolvedValue(mockUser);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/user_002",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockUser);
    expect(mockGetUserSafe).toHaveBeenCalledWith({ id: "user_002" });
  });

  it("should return 200 when target user does not exist (null serialized as empty object)", async () => {
    mockGetUserSafe.mockResolvedValue(null);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/nonexistent",
    });

    expect(res.statusCode).toBe(200);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/@me",
    });

    expect(res.statusCode).toBe(401);
    expect(mockGetUserSafe).not.toHaveBeenCalled();
  });

  it("should return 404 when the authenticated user is not found in DB", async () => {
    mockGetUserSafe.mockRejectedValue(new AppError("User not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/@me",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockGetUserSafe.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/users/@me",
    });

    expect(res.statusCode).toBe(500);
  });
});
