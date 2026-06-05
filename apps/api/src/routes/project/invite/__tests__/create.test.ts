import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../create.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockCreateInvite, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockCreateInvite = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { createInvite: typeof mockCreateInvite }, _userId: string) {
    this.createInvite = mockCreateInvite;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockCreateInvite, mockAuthenticate, MockProjectService };
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

describe("POST /projects/:id/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true when the invitation is created successfully", async () => {
    /* createInvite returns void in the service, but the route sends the result
     * directly and the response schema prescribes { ok: true } */
    const mockInvite = {
      id: "inv_001",
      slug: "invite-slug",
      projectId: "proj_001",
      expiresAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockCreateInvite.mockResolvedValue(mockInvite);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/invites",
      payload: { email: "invitee@test.com" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockInvite);
    expect(mockCreateInvite).toHaveBeenCalledWith("invitee@test.com", "proj_001");
  });

  it("should return 400 when email is missing from body", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/invites",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(mockCreateInvite).not.toHaveBeenCalled();
  });

  it("should return 400 when body is empty", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/invites",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/invites",
      payload: { email: "invitee@test.com" },
    });

    expect(res.statusCode).toBe(401);
    expect(mockCreateInvite).not.toHaveBeenCalled();
  });

  it("should return 403 when inviter lacks permission to create invites", async () => {
    mockCreateInvite.mockRejectedValue(
      new AppError("You don't have permission to create invites", 403, "FORBIDDEN"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_002", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/invites",
      payload: { email: "invitee@test.com" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("should return 404 when the project or invited user is not found", async () => {
    mockCreateInvite.mockRejectedValue(new AppError("User not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/nonexistent/invites",
      payload: { email: "unknown@test.com" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockCreateInvite.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "owner@test.com", username: "owner" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/projects/proj_001/invites",
      payload: { email: "invitee@test.com" },
    });

    expect(res.statusCode).toBe(500);
  });
});
