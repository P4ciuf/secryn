import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../core/errors/errorHandler.js";
import route from "../create.route.js";

const { mockGenerateApiKey, mockAuthenticate, MockApiKeyService } = vi.hoisted(() => {
  const mockGenerateApiKey = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockApiKeyService(
    this: { generateApiKey: typeof mockGenerateApiKey },
    _user: { id: string; email: string; username: string },
  ) {
    this.generateApiKey = mockGenerateApiKey;
  }
  MockApiKeyService.Instance = async (_userId: string) =>
    new (MockApiKeyService as any)({ id: _userId });
  return { mockGenerateApiKey, mockAuthenticate, MockApiKeyService };
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
  key: "sc_decrypted_key_value",
  userId: "user_001",
  isActive: true,
  permissions: ["READ", "WRITE"],
  createdAt: now,
  updatedAt: now,
};

describe("POST /api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 201 with the created API key", async () => {
    mockGenerateApiKey.mockResolvedValue(mockApiKey);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: { name: "My API Key", permissions: ["READ", "WRITE"] },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockApiKey);
    expect(mockGenerateApiKey).toHaveBeenCalledWith({
      name: "My API Key",
      permissions: ["READ", "WRITE"],
    });
  });

  it("should return 400 when the name field is missing", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: { permissions: ["READ"] },
    });

    expect(res.statusCode).toBe(400);
    expect(mockGenerateApiKey).not.toHaveBeenCalled();
  });

  it("should return 400 when the body is empty", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(mockGenerateApiKey).not.toHaveBeenCalled();
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: { name: "My API Key" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockGenerateApiKey).not.toHaveBeenCalled();
  });

  it("should return 500 when ApiKeyService throws an unexpected error", async () => {
    mockGenerateApiKey.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/api-keys",
      payload: { name: "My API Key" },
    });

    expect(res.statusCode).toBe(500);
  });
});
