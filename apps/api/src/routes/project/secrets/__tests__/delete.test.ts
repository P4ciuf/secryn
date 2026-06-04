import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../delete.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockDeleteSecret, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockDeleteSecret = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { deleteSecret: typeof mockDeleteSecret }, _userId: string) {
    this.deleteSecret = mockDeleteSecret;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockDeleteSecret, mockAuthenticate, MockProjectService };
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

describe("DELETE /projects/secrets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 204 when the secret is deleted successfully", async () => {
    mockDeleteSecret.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(204);
    expect(mockDeleteSecret).toHaveBeenCalledWith("sec_001");
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(401);
    expect(mockDeleteSecret).not.toHaveBeenCalled();
  });

  it("should return 403 when user lacks DELETE_SECRETS permission", async () => {
    mockDeleteSecret.mockRejectedValue(
      new AppError("You are not authorized to perform this action", 403, "FORBIDDEN"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when the secret does not exist", async () => {
    mockDeleteSecret.mockRejectedValue(new AppError("Secret not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/secrets/nonexistent",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockDeleteSecret.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/secrets/sec_001",
    });

    expect(res.statusCode).toBe(500);
  });
});
