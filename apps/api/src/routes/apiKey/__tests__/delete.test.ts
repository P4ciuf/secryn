import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../delete.route.js";

const { mockDeleteApiKeyById, mockAuthenticate, MockApiKeyService } = vi.hoisted(() => {
  const mockDeleteApiKeyById = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockApiKeyService(
    this: { deleteApiKeyById: typeof mockDeleteApiKeyById },
    _user: { id: string; email: string; username: string },
  ) {
    this.deleteApiKeyById = mockDeleteApiKeyById;
  }
  MockApiKeyService.Instance = async (_userId: string) =>
    new (MockApiKeyService as any)({ id: _userId });
  return { mockDeleteApiKeyById, mockAuthenticate, MockApiKeyService };
});

vi.mock("../../../core/apiKeys/service.js", () => ({
  ApiKeyService: MockApiKeyService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("DELETE /api-keys/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 204 and delete the API key", async () => {
    mockDeleteApiKeyById.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/api-keys/key_001",
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(mockDeleteApiKeyById).toHaveBeenCalledWith("key_001");
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/api-keys/key_001",
    });

    expect(res.statusCode).toBe(401);
    expect(mockDeleteApiKeyById).not.toHaveBeenCalled();
  });

  it("should return 404 when the API key does not exist", async () => {
    mockDeleteApiKeyById.mockRejectedValue(
      new AppError("Api Key not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/api-keys/nonexistent",
    });

    expect(res.statusCode).toBe(404);
    expect(mockDeleteApiKeyById).toHaveBeenCalledWith("nonexistent");
  });

  it("should return 500 when ApiKeyService throws an unexpected error", async () => {
    mockDeleteApiKeyById.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/api-keys/key_001",
    });

    expect(res.statusCode).toBe(500);
  });
});
