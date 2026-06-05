import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../delete.route.js";

const { mockDeleteUser, mockAuthenticate, MockUserService } = vi.hoisted(() => {
  const mockDeleteUser = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockUserService(
    this: { deleteUser: typeof mockDeleteUser },
    _user: { id: string; email: string; username: string },
  ) {
    this.deleteUser = mockDeleteUser;
  }
  MockUserService.Instance = async (userId: string) => new (MockUserService as any)({ id: userId });
  return { mockDeleteUser, mockAuthenticate, MockUserService };
});

vi.mock("../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

/**
 * Boots a minimal Fastify instance with cookie parsing, error handling,
 * a mocked authenticate decorator, and the delete-user route under test.
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("DELETE /users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 204 and delete the authenticated user", async () => {
    mockDeleteUser.mockResolvedValue({ id: "user_001" });
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/users",
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(mockDeleteUser).toHaveBeenCalledWith({ id: "user_001" });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/users",
    });

    expect(res.statusCode).toBe(401);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("should return 404 when the authenticated user is not found in DB", async () => {
    mockDeleteUser.mockRejectedValue(new AppError("User not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/users",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockDeleteUser.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/users",
    });

    expect(res.statusCode).toBe(500);
  });
});
