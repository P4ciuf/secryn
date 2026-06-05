import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../update.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockUpdateProject, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockUpdateProject = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { updateProject: typeof mockUpdateProject }, _userId: string) {
    this.updateProject = mockUpdateProject;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockUpdateProject, mockAuthenticate, MockProjectService };
});

vi.mock("../../../../modules/project/service.js", () => ({
  ProjectService: MockProjectService,
}));

/**
 * Boots a minimal Fastify instance pre-configured for integration testing,
 * with mocked authentication and the route under test registered.
 *
 * @returns A Fastify instance ready for `app.inject()` calls
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("PUT /projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with the updated project when owner renames", async () => {
    const mockProject = {
      id: "proj_001",
      name: "Renamed Vault",
      slug: "renamed-vault",
      ownerId: "user_001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUpdateProject.mockResolvedValue(mockProject);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/proj_001",
      payload: { name: "Renamed Vault" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockProject);
    expect(mockUpdateProject).toHaveBeenCalledWith({ id: "proj_001" }, { name: "Renamed Vault" });
  });

  it("should return 200 when updating with empty body (all fields optional)", async () => {
    const mockProject = {
      id: "proj_001",
      name: "My Vault",
      slug: "my-vault",
      ownerId: "user_001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUpdateProject.mockResolvedValue(mockProject);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/proj_001",
      payload: {},
    });

    expect(res.statusCode).toBe(200);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/proj_001",
      payload: { name: "Renamed Vault" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockUpdateProject).not.toHaveBeenCalled();
  });

  it("should return 403 when a non-owner tries to rename", async () => {
    mockUpdateProject.mockRejectedValue(
      new AppError("You are not authorized to perform this action", 403, "FORBIDDEN"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/proj_001",
      payload: { name: "Renamed Vault" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when project does not exist", async () => {
    mockUpdateProject.mockRejectedValue(
      new AppError("Project not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/nonexistent",
      payload: { name: "Renamed Vault" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockUpdateProject.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/proj_001",
      payload: { name: "Renamed Vault" },
    });

    expect(res.statusCode).toBe(500);
  });
});
