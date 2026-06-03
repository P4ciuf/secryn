import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../remove.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockRemoveMemberToProject, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockRemoveMemberToProject = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(
    this: { removeMemberToProject: typeof mockRemoveMemberToProject },
    _userId: string,
  ) {
    this.removeMemberToProject = mockRemoveMemberToProject;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockRemoveMemberToProject, mockAuthenticate, MockProjectService };
});

vi.mock("../../../../modules/project/service.js", () => ({
  ProjectService: MockProjectService,
}));

/**
 * Boots a minimal Fastify instance pre-configured for integration testing,
 * with mocked authentication, the global error handler, and the route under test registered.
 */
function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("DELETE /projects/:projectId/members/:memberId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 204 when the member is removed successfully", async () => {
    mockRemoveMemberToProject.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/proj_001/members/member_002",
    });

    expect(res.statusCode).toBe(204);
    expect(mockRemoveMemberToProject).toHaveBeenCalledWith("member_002", "proj_001");
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/proj_001/members/member_002",
    });

    expect(res.statusCode).toBe(401);
    expect(mockRemoveMemberToProject).not.toHaveBeenCalled();
  });

  it("should return 403 when the caller lacks REMOVE_MEMBERS permission", async () => {
    mockRemoveMemberToProject.mockRejectedValue(new AppError("Forbidden", 403, "FORBIDDEN"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/proj_001/members/member_003",
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 400 when the caller tries to remove themselves", async () => {
    mockRemoveMemberToProject.mockRejectedValue(
      new AppError("You cannot remove yourself from the project", 400, "BAD_REQUEST"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/proj_001/members/user_001",
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 404 when the project or member does not exist", async () => {
    mockRemoveMemberToProject.mockRejectedValue(
      new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/nonexistent/members/member_002",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockRemoveMemberToProject.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "DELETE",
      url: "/projects/proj_001/members/member_002",
    });

    expect(res.statusCode).toBe(500);
  });
});
