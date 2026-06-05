import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../create.route.js";
import type { Secret } from "@repo/shared";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockCreateSecret, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockCreateSecret = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { createSecret: typeof mockCreateSecret }, _userId: string) {
    this.createSecret = mockCreateSecret;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockCreateSecret, mockAuthenticate, MockProjectService };
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
} as unknown as Secret;

describe("POST /projects/:projectId/secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 201 with the created secret when authentication succeeds", async () => {
    mockCreateSecret.mockResolvedValue(mockSecret);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        name: "DATABASE_URL",
        value: "postgresql://user:pass@localhost:5432/mydb",
        notes: "Production database connection string",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual(mockSecret);
    expect(mockCreateSecret).toHaveBeenCalledWith("proj_001", {
      name: "DATABASE_URL",
      value: "postgresql://user:pass@localhost:5432/mydb",
      notes: "Production database connection string",
    });
  });

  it("should return 400 when name is missing", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        value: "some-value",
        notes: "some notes",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it("should return 400 when value is missing", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        name: "DATABASE_URL",
        notes: "some notes",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it("should return 400 when notes is missing", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        name: "DATABASE_URL",
        value: "some-value",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it("should return 400 when body is empty", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        name: "DATABASE_URL",
        value: "postgresql://user:pass@localhost:5432/mydb",
        notes: "Production database connection string",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(mockCreateSecret).not.toHaveBeenCalled();
  });

  it("should return 403 when user lacks CREATE_SECRETS permission", async () => {
    mockCreateSecret.mockRejectedValue(
      new AppError("You are not authorized to perform this action", 403, "FORBIDDEN"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        name: "DATABASE_URL",
        value: "postgresql://user:pass@localhost:5432/mydb",
        notes: "Production database connection string",
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when project does not exist", async () => {
    mockCreateSecret.mockRejectedValue(
      new AppError("Project not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/nonexistent/secrets",
      payload: {
        name: "DATABASE_URL",
        value: "postgresql://user:pass@localhost:5432/mydb",
        notes: "Production database connection string",
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockCreateSecret.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/secrets",
      payload: {
        name: "DATABASE_URL",
        value: "postgresql://user:pass@localhost:5432/mydb",
        notes: "Production database connection string",
      },
    });

    expect(res.statusCode).toBe(500);
  });
});
