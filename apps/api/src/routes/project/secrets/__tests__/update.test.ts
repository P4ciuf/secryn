import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../update.route.js";
import type { Secret } from "@repo/shared";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockUpdateSecret, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockUpdateSecret = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { updateSecret: typeof mockUpdateSecret }, _userId: string) {
    this.updateSecret = mockUpdateSecret;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockUpdateSecret, mockAuthenticate, MockProjectService };
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
  value: "postgresql://user:pass@localhost:5432/newdb",
  notes: "Staging database connection string",
  projectId: "proj_001",
  addedById: "user_001",
  updatedById: "user_001",
  createdAt: now,
  updatedAt: now,
} as Secret;

describe("PUT /projects/secrets/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with the updated secret when all fields are provided", async () => {
    mockUpdateSecret.mockResolvedValue(mockSecret);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: {
        name: "DATABASE_URL",
        value: "postgresql://user:pass@localhost:5432/newdb",
        notes: "Staging database connection string",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockSecret);
    expect(mockUpdateSecret).toHaveBeenCalledWith("sec_001", {
      name: "DATABASE_URL",
      value: "postgresql://user:pass@localhost:5432/newdb",
      notes: "Staging database connection string",
    });
  });

  it("should return 200 when only the name is updated", async () => {
    const partialUpdate: Secret = { ...mockSecret, name: "NEW_DB_URL", notes: mockSecret.notes };
    mockUpdateSecret.mockResolvedValue(partialUpdate);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: { name: "NEW_DB_URL" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(partialUpdate);
    expect(mockUpdateSecret).toHaveBeenCalledWith("sec_001", { name: "NEW_DB_URL" });
  });

  it("should return 200 when only the value is updated", async () => {
    const partialUpdate: Secret = { ...mockSecret, value: "new-value", notes: mockSecret.notes };
    mockUpdateSecret.mockResolvedValue(partialUpdate);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: { value: "new-value" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(partialUpdate);
    expect(mockUpdateSecret).toHaveBeenCalledWith("sec_001", { value: "new-value" });
  });

  it("should return 200 when only the notes are updated", async () => {
    const partialUpdate: Secret = { ...mockSecret, notes: "new notes" };
    mockUpdateSecret.mockResolvedValue(partialUpdate);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: { notes: "new notes" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(partialUpdate);
    expect(mockUpdateSecret).toHaveBeenCalledWith("sec_001", { notes: "new notes" });
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: { name: "NEW_NAME" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockUpdateSecret).not.toHaveBeenCalled();
  });

  it("should return 403 when user lacks UPDATE_SECRETS permission", async () => {
    mockUpdateSecret.mockRejectedValue(
      new AppError("You are not authorized to perform this action", 403, "FORBIDDEN"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: { name: "NEW_NAME" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when the secret does not exist", async () => {
    mockUpdateSecret.mockRejectedValue(new AppError("Secret not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/nonexistent",
      payload: { name: "NEW_NAME" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockUpdateSecret.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "PUT",
      url: "/projects/secrets/sec_001",
      payload: { name: "NEW_NAME" },
    });

    expect(res.statusCode).toBe(500);
  });
});
