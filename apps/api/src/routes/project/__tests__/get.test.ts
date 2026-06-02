import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../core/errors/appError.js";
import route from "../get.route.js";

const { mockGetProject, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockGetProject = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { getProject: typeof mockGetProject }, _userId: string) {
    this.getProject = mockGetProject;
  }
  return { mockGetProject, mockAuthenticate, MockProjectService };
});

vi.mock("../../../modules/project/service.js", () => ({
  ProjectService: MockProjectService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
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
    mockGetProject.mockResolvedValue(mockProject);
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
    expect(mockGetProject).toHaveBeenCalledWith({ id: "proj_001" });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001",
    });

    expect(res.statusCode).toBe(401);
    expect(mockGetProject).not.toHaveBeenCalled();
  });

  it("should return 404 when project is not found", async () => {
    mockGetProject.mockRejectedValue(new AppError("Project not found", 404, "RESOURCE_NOT_FOUND"));
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
    mockGetProject.mockRejectedValue(new Error("Database connection failed"));
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
