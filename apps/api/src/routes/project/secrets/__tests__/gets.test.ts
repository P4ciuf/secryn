import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../gets.route.js";
import type { ProjectSecretsData, Secret } from "@repo/shared";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockGetProjectSecrets, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockGetProjectSecrets = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(
    this: { getProjectSecrets: typeof mockGetProjectSecrets },
    _userId: string,
  ) {
    this.getProjectSecrets = mockGetProjectSecrets;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockGetProjectSecrets, mockAuthenticate, MockProjectService };
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

const mockSecrets = {
  name: "My Vault",
  secrets: [
    {
      id: "sec_001",
      name: "DATABASE_URL",
      value: "postgresql://user:pass@localhost:5432/mydb",
      notes: "Production database connection string",
      projectId: "proj_001",
      addedById: "user_001",
      updatedById: "user_001",
      createdAt: now,
      updatedAt: now,
    } as Secret,
  ],
} as ProjectSecretsData;

describe("GET /projects/:projectId/secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with project secrets when authentication succeeds", async () => {
    mockGetProjectSecrets.mockResolvedValue(mockSecrets);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockSecrets);
    expect(mockGetProjectSecrets).toHaveBeenCalledWith("proj_001");
  });

  it("should return 200 with an empty secret list when project has no secrets", async () => {
    const emptySecrets = { name: "Empty Vault", secrets: [] } as ProjectSecretsData;
    mockGetProjectSecrets.mockResolvedValue(emptySecrets);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_002/secrets",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(emptySecrets);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets",
    });

    expect(res.statusCode).toBe(401);
    expect(mockGetProjectSecrets).not.toHaveBeenCalled();
  });

  it("should return 404 when the project does not exist", async () => {
    mockGetProjectSecrets.mockRejectedValue(
      new AppError("Project not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/nonexistent/secrets",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockGetProjectSecrets.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets",
    });

    expect(res.statusCode).toBe(500);
  });
});
