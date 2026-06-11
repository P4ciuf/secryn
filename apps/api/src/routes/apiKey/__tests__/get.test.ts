import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../get.route.js";

const { mockGetApiKeyById, mockGetUserApiKeys, mockAuthenticate, MockApiKeyService } = vi.hoisted(
  () => {
    const mockGetApiKeyById = vi.fn();
    const mockGetUserApiKeys = vi.fn();
    const mockAuthenticate = vi.fn();
    function MockApiKeyService(
      this: {
        getApiKeyById: typeof mockGetApiKeyById;
        getUserApiKeys: typeof mockGetUserApiKeys;
      },
      _user: { id: string; email: string; username: string },
    ) {
      this.getApiKeyById = mockGetApiKeyById;
      this.getUserApiKeys = mockGetUserApiKeys;
    }
    MockApiKeyService.Instance = async (_userId: string) =>
      new (MockApiKeyService as any)({ id: _userId });
    return { mockGetApiKeyById, mockGetUserApiKeys, mockAuthenticate, MockApiKeyService };
  },
);

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

const now = new Date().toISOString();

const mockApiKey = {
  id: "key_001",
  name: "My API Key",
  userId: "user_001",
  isActive: true,
  permissions: ["READ", "WRITE"],
  createdAt: now,
  updatedAt: now,
};

describe("GET /api-keys/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with a single API key by ID", async () => {
    mockGetApiKeyById.mockResolvedValue(mockApiKey);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api-keys/key_001",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockApiKey);
    expect(mockGetApiKeyById).toHaveBeenCalledWith("key_001");
    expect(mockGetUserApiKeys).not.toHaveBeenCalled();
  });

  it("should return 200 with all user API keys when id is @all-user", async () => {
    const mockKeys = [mockApiKey, { ...mockApiKey, id: "key_002", name: "Second Key" }];
    mockGetUserApiKeys.mockResolvedValue(mockKeys);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api-keys/@all-user",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockKeys);
    expect(mockGetUserApiKeys).toHaveBeenCalledWith();
    expect(mockGetApiKeyById).not.toHaveBeenCalled();
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api-keys/key_001",
    });

    expect(res.statusCode).toBe(401);
    expect(mockGetApiKeyById).not.toHaveBeenCalled();
    expect(mockGetUserApiKeys).not.toHaveBeenCalled();
  });

  it("should return 404 when the API key does not exist", async () => {
    mockGetApiKeyById.mockResolvedValue(null);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api-keys/nonexistent",
    });

    expect(res.statusCode).toBe(404);
    expect(mockGetApiKeyById).toHaveBeenCalledWith("nonexistent");
  });

  it("should return 500 when ApiKeyService throws an unexpected error", async () => {
    mockGetApiKeyById.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/api-keys/key_001",
    });

    expect(res.statusCode).toBe(500);
  });
});
