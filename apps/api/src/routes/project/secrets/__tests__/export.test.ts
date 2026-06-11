import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../export.route.js";

const { mockExportProjectSecrets, mockGetProjectOrThrow, mockAuthenticate, MockProjectService } =
  vi.hoisted(() => {
    const mockExportProjectSecrets = vi.fn();
    const mockGetProjectOrThrow = vi.fn();
    const mockAuthenticate = vi.fn();
    function MockProjectService(
      this: {
        exportProjectSecrets: typeof mockExportProjectSecrets;
        getProjectOrThrow: typeof mockGetProjectOrThrow;
      },
      _userId: string,
    ) {
      this.exportProjectSecrets = mockExportProjectSecrets;
      this.getProjectOrThrow = mockGetProjectOrThrow;
    }
    MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
    return {
      mockExportProjectSecrets,
      mockGetProjectOrThrow,
      mockAuthenticate,
      MockProjectService,
    };
  });

vi.mock("../../../../modules/project/service.js", () => ({
  ProjectService: MockProjectService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

const mockProject = {
  id: "proj_001",
  name: "Test Project",
  slug: "test-project",
  ownerId: "user_001",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockEnvContent = "DATABASE_URL=postgresql://user:pass@localhost:5432/mydb\nAPI_KEY=abc123";

describe("GET /projects/:projectId/secrets/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with dotenv content and correct headers", async () => {
    mockExportProjectSecrets.mockResolvedValue(mockEnvContent);
    mockGetProjectOrThrow.mockResolvedValue(mockProject);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets/export",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(mockEnvContent);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="test-project.env"');
    expect(mockExportProjectSecrets).toHaveBeenCalledWith("proj_001");
    expect(mockGetProjectOrThrow).toHaveBeenCalledWith({ id: "proj_001" });
  });

  it("should return 401 when no auth is provided", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets/export",
    });

    expect(res.statusCode).toBe(401);
    expect(mockExportProjectSecrets).not.toHaveBeenCalled();
  });

  it("should return 403 when user lacks READ_SECRETS permission", async () => {
    mockExportProjectSecrets.mockRejectedValue(
      new AppError("You are not authorized to perform this action", 403, "FORBIDDEN"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets/export",
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when project does not exist", async () => {
    mockExportProjectSecrets.mockRejectedValue(
      new AppError("Project not found", 404, "RESOURCE_NOT_FOUND"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/nonexistent/secrets/export",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when an unexpected error occurs", async () => {
    mockExportProjectSecrets.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/proj_001/secrets/export",
    });

    expect(res.statusCode).toBe(500);
  });
});
