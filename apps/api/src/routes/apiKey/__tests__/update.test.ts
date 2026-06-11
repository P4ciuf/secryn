import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../update.route.js";

const {
  mockUpdateApiKeyName,
  mockUpdateApiKeyStatus,
  mockUpdateApiKeyPermissions,
  mockGetApiKeyOrThrow,
  mockAuthenticate,
  MockApiKeyService,
} = vi.hoisted(() => {
  const mockUpdateApiKeyName = vi.fn();
  const mockUpdateApiKeyStatus = vi.fn();
  const mockUpdateApiKeyPermissions = vi.fn();
  const mockGetApiKeyOrThrow = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockApiKeyService(
    this: {
      updateApiKeyName: typeof mockUpdateApiKeyName;
      updateApiKeyStatus: typeof mockUpdateApiKeyStatus;
      updateApiKeyPermissions: typeof mockUpdateApiKeyPermissions;
      getApiKeyOrThrow: typeof mockGetApiKeyOrThrow;
    },
    _user: { id: string; email: string; username: string },
  ) {
    this.updateApiKeyName = mockUpdateApiKeyName;
    this.updateApiKeyStatus = mockUpdateApiKeyStatus;
    this.updateApiKeyPermissions = mockUpdateApiKeyPermissions;
    this.getApiKeyOrThrow = mockGetApiKeyOrThrow;
  }
  MockApiKeyService.Instance = async (_userId: string) =>
    new (MockApiKeyService as any)({ id: _userId });
  return {
    mockUpdateApiKeyName,
    mockUpdateApiKeyStatus,
    mockUpdateApiKeyPermissions,
    mockGetApiKeyOrThrow,
    mockAuthenticate,
    MockApiKeyService,
  };
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

describe("PUT /api-keys/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 and update the API key name", async () => {
    const updatedKey = { ...mockApiKey, name: "Renamed Key" };
    mockGetApiKeyOrThrow.mockResolvedValue(updatedKey);
    mockUpdateApiKeyName.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/api-keys/key_001",
      payload: { name: "Renamed Key" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(updatedKey);
    expect(mockUpdateApiKeyName).toHaveBeenCalledWith("key_001", "Renamed Key");
    expect(mockGetApiKeyOrThrow).toHaveBeenCalledWith({ id: "key_001" });
  });

  it("should return 200 and update the API key status", async () => {
    const updatedKey = { ...mockApiKey, isActive: false };
    mockGetApiKeyOrThrow.mockResolvedValue(updatedKey);
    mockUpdateApiKeyStatus.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/api-keys/key_001",
      payload: { isActive: false },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(updatedKey);
    expect(mockUpdateApiKeyStatus).toHaveBeenCalledWith("key_001", false);
    expect(mockGetApiKeyOrThrow).toHaveBeenCalledWith({ id: "key_001" });
  });

  it("should return 200 and update the API key permissions", async () => {
    const updatedKey = { ...mockApiKey, permissions: ["WRITE"] };
    mockGetApiKeyOrThrow.mockResolvedValue(updatedKey);
    mockUpdateApiKeyPermissions.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/api-keys/key_001",
      payload: { addPermissions: ["WRITE"], removePermissions: ["READ"] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(updatedKey);
    expect(mockUpdateApiKeyPermissions).toHaveBeenCalledWith("key_001", {
      addPermissions: ["WRITE"],
      removePermissions: ["READ"],
    });
    expect(mockGetApiKeyOrThrow).toHaveBeenCalledWith({ id: "key_001" });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/api-keys/key_001",
      payload: { name: "Renamed Key" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockUpdateApiKeyName).not.toHaveBeenCalled();
    expect(mockGetApiKeyOrThrow).not.toHaveBeenCalled();
  });

  it("should return 404 when the API key does not exist", async () => {
    mockGetApiKeyOrThrow.mockRejectedValue(
      new AppError("Api Key not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/api-keys/nonexistent",
      payload: { name: "Renamed Key" },
    });

    expect(res.statusCode).toBe(404);
    expect(mockUpdateApiKeyName).toHaveBeenCalledWith("nonexistent", "Renamed Key");
  });

  it("should return 500 when ApiKeyService throws an unexpected error", async () => {
    mockGetApiKeyOrThrow.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/api-keys/key_001",
      payload: { name: "Renamed Key" },
    });

    expect(res.statusCode).toBe(500);
  });
});
