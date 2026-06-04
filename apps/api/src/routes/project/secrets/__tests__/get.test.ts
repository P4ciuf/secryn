import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../get.route.js";
import type { Secret } from "@repo/shared";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockGetSecret, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockGetSecret = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { getSecret: typeof mockGetSecret }, _userId: string) {
    this.getSecret = mockGetSecret;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockGetSecret, mockAuthenticate, MockProjectService };
});

vi.mock("../../../../modules/project/service.js", () => ({
  ProjectService: MockProjectService,
}));

/**
 * Boots a minimal Fastify instance pre-configured for integration testing,
 * with mocked authentication and the route under test registered.
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

const mockSecret = {
  id: "sec_001",
  name: "DATABASE_URL",
  value: "postgresql://user:pass@localhost:5432/mydb",
  notes: "Production database connection string",
  projectId: "proj_001",
  addedById: "user_001",
  updatedById: "user_001",
  createdAt: now,
  updatedAt: now,
} as Secret;

describe("GET /projects/secrets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with the secret when the secret exists", async () => {
    mockGetSecret.mockResolvedValue(mockSecret);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockSecret);
    expect(mockGetSecret).toHaveBeenCalledWith("sec_001");
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(401);
    expect(mockGetSecret).not.toHaveBeenCalled();
  });

  it("should return 404 when the secret does not exist", async () => {
    mockGetSecret.mockRejectedValue(new AppError("Secret not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/secrets/nonexistent",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockGetSecret.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(500);
  });
});
