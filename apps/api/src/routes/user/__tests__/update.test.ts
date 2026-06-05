import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../update.route.js";

const { mockUpdateUser, mockAuthenticate, MockUserService } = vi.hoisted(() => {
  const mockUpdateUser = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockUserService(
    this: { updateUser: typeof mockUpdateUser },
    _user: { id: string; email: string; username: string },
  ) {
    this.updateUser = mockUpdateUser;
  }
  MockUserService.Instance = async (userId: string) => new (MockUserService as any)({ id: userId });
  return { mockUpdateUser, mockAuthenticate, MockUserService };
});

vi.mock("../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

/**
 * Boots a minimal Fastify instance with cookie parsing, error handling,
 * a mocked authenticate decorator, and the update-user route under test.
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
  email: "jane@example.com",
  username: "Jane Doe",
  role: "admin",
  password: "$2b$12$hashedpasswordvalue",
  createdAt: now,
  updatedAt: now,
};

describe("PUT /users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 201 with the updated user when updating name and email", async () => {
    mockUpdateUser.mockResolvedValue(mockUser);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: { name: "Jane Doe", email: "jane@example.com" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockUser);
    expect(mockUpdateUser).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@example.com",
    });
  });

  it("should return 201 when updating password with valid credentials", async () => {
    mockUpdateUser.mockResolvedValue(mockUser);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: { currentPassword: "oldSecret123", newPassword: "newSecret456" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockUser);
    expect(mockUpdateUser).toHaveBeenCalledWith({
      currentPassword: "oldSecret123",
      newPassword: "newSecret456",
    });
  });

  it("should return 201 when body is empty (all fields are optional)", async () => {
    mockUpdateUser.mockResolvedValue(mockUser);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: {},
    });

    expect(res.statusCode).toBe(201);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: { name: "Jane Doe" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("should return 401 when current password is incorrect", async () => {
    mockUpdateUser.mockRejectedValue(new AppError("Invalid current password", 401, "UNAUTHORIZED"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: { currentPassword: "wrongpass", newPassword: "newSecret456" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 409 when email or username is already taken", async () => {
    mockUpdateUser.mockRejectedValue(new AppError("User already exists", 409, "CONFLICT"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: { name: "TakenName", email: "taken@example.com" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockUpdateUser.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "john@example.com", username: "John Doe" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/users",
      payload: { name: "Jane Doe" },
    });

    expect(res.statusCode).toBe(500);
  });
});
