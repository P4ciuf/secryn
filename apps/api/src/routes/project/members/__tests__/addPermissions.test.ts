import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../addPermissions.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockAddPermissionsToMember, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockAddPermissionsToMember = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(
    this: { addPermissionsToMember: typeof mockAddPermissionsToMember },
    _userId: string,
  ) {
    this.addPermissionsToMember = mockAddPermissionsToMember;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockAddPermissionsToMember, mockAuthenticate, MockProjectService };
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

describe("POST /projects/:projectId/members/:memberId/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 204 when permissions are added successfully", async () => {
    mockAddPermissionsToMember.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/members/member_001/permissions",
      payload: { permissions: ["READ_SECRETS", "CREATE_SECRETS"] },
    });

    expect(res.statusCode).toBe(204);
    expect(mockAddPermissionsToMember).toHaveBeenCalledWith("member_001", "proj_001", [
      "READ_SECRETS",
      "CREATE_SECRETS",
    ]);
  });

  it("should return 400 when the permissions array is missing", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/members/member_001/permissions",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(mockAddPermissionsToMember).not.toHaveBeenCalled();
  });

  it("should return 400 when the payload is empty", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/members/member_001/permissions",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/members/member_001/permissions",
      payload: { permissions: ["READ_SECRETS"] },
    });

    expect(res.statusCode).toBe(401);
    expect(mockAddPermissionsToMember).not.toHaveBeenCalled();
  });

  it("should return 403 when the caller lacks MANAGE_MEMBERS permission", async () => {
    mockAddPermissionsToMember.mockRejectedValue(new AppError("Forbidden", 403, "FORBIDDEN"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/members/member_001/permissions",
      payload: { permissions: ["READ_SECRETS"] },
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when the project or member does not exist", async () => {
    mockAddPermissionsToMember.mockRejectedValue(
      new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/nonexistent/members/member_001/permissions",
      payload: { permissions: ["READ_SECRETS"] },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockAddPermissionsToMember.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "admin@test.com", username: "admin" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/members/member_001/permissions",
      payload: { permissions: ["READ_SECRETS"] },
    });

    expect(res.statusCode).toBe(500);
  });
});
