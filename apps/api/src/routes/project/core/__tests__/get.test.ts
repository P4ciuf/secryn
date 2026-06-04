import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../get.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockGetProjectOrThrow, mockGetUserProjects, mockAuthenticate, MockProjectService } =
  vi.hoisted(() => {
    const mockGetProjectOrThrow = vi.fn();
    const mockGetUserProjects = vi.fn();
    const mockAuthenticate = vi.fn();
    function MockProjectService(
      this: {
        getProjectOrThrow: typeof mockGetProjectOrThrow;
        getUserProjects: typeof mockGetUserProjects;
      },
      _userId: string,
    ) {
      this.getProjectOrThrow = mockGetProjectOrThrow;
      this.getUserProjects = mockGetUserProjects;
    }
    // ProjectService.Instance is a static async factory method — the mock must mirror it.
    MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
    return { mockGetProjectOrThrow, mockGetUserProjects, mockAuthenticate, MockProjectService };
  });

vi.mock("../../../../modules/project/service.js", () => ({
  ProjectService: MockProjectService,
}));

vi.mock("../../../../core/logger/index.js", () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
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

describe("GET /projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with the project when found", async () => {
    const mockProject = {
      id: "proj_001",
      name: "My Vault",
      slug: "my-vault",
      ownerId: "user_001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockGetProjectOrThrow.mockResolvedValue(mockProject);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockProject);
    expect(mockGetProjectOrThrow).toHaveBeenCalledWith({ id: "proj_001" });
  });

  it("should return 200 with projects array when id is '@all'", async () => {
    const mockProjects = [
      {
        id: "proj_001",
        name: "Vault 1",
        slug: "vault-1",
        ownerId: "user_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "proj_002",
        name: "Vault 2",
        slug: "vault-2",
        ownerId: "user_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockGetUserProjects.mockResolvedValue(mockProjects);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/@all",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockProjects);
    expect(mockGetUserProjects).toHaveBeenCalledOnce();
    expect(mockGetProjectOrThrow).not.toHaveBeenCalled();
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001",
    });

    expect(res.statusCode).toBe(401);
    expect(mockGetProjectOrThrow).not.toHaveBeenCalled();
  });

  it("should return 404 when project is not found", async () => {
    mockGetProjectOrThrow.mockRejectedValue(
      new AppError("Project not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/nonexistent",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockGetProjectOrThrow.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001",
    });

    expect(res.statusCode).toBe(500);
  });
});
