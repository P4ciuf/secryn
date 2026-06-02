import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../create.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockCreateProject, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockCreateProject = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { createProject: typeof mockCreateProject }, _userId: string) {
    this.createProject = mockCreateProject;
  }
  return { mockCreateProject, mockAuthenticate, MockProjectService };
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
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

describe("POST /projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with the created project when authentication succeeds", async () => {
    const mockProject = {
      id: "proj_001",
      name: "My Vault",
      slug: "my-vault",
      ownerId: "user_001",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCreateProject.mockResolvedValue(mockProject);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "My Vault" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockProject);
    expect(mockCreateProject).toHaveBeenCalledWith("My Vault");
  });

  it("should return 400 when name is missing", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("should return 400 when body is empty", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "My Vault" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("should return 400 when project name already exists", async () => {
    mockCreateProject.mockRejectedValue(new AppError("Project already exists", 400, "BAD_REQUEST"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "Existing" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockCreateProject.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects",
      payload: { name: "My Vault" },
    });

    expect(res.statusCode).toBe(500);
  });
});
