import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../accept.route.js";

// vi.hoisted ensures mock declarations are evaluated before the module graph is loaded,
// which is required by Vitest for vi.mock() to correctly intercept ES module imports.
const { mockAcceptInvite, mockAuthenticate, MockProjectService } = vi.hoisted(() => {
  const mockAcceptInvite = vi.fn();
  const mockAuthenticate = vi.fn();
  function MockProjectService(this: { acceptInvite: typeof mockAcceptInvite }, _userId: string) {
    this.acceptInvite = mockAcceptInvite;
  }
  // ProjectService.Instance is a static async factory method — the mock must mirror it.
  MockProjectService.Instance = async (userId: string) => new (MockProjectService as any)(userId);
  return { mockAcceptInvite, mockAuthenticate, MockProjectService };
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

describe("GET /projects/invites/:slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 204 with no content when invitation is accepted successfully", async () => {
    /* acceptInvite returns void — no response body is sent for 204 */
    mockAcceptInvite.mockResolvedValue(undefined);
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/invites/invite-slug-abc123",
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(mockAcceptInvite).toHaveBeenCalledWith("invite-slug-abc123");
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/invites/invite-slug-abc123",
    });

    expect(res.statusCode).toBe(401);
    expect(mockAcceptInvite).not.toHaveBeenCalled();
  });

  it("should return 400 when the invite has expired", async () => {
    mockAcceptInvite.mockRejectedValue(new AppError("Invite has expired", 400, "BAD_REQUEST"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/invites/expired-slug",
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when the user is already a member", async () => {
    mockAcceptInvite.mockRejectedValue(
      new AppError("User is already a member of this project", 400, "BAD_REQUEST"),
    );
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/invites/already-member-slug",
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 404 when the invite does not exist", async () => {
    mockAcceptInvite.mockRejectedValue(new AppError("Invite not found", 404, "RESOURCE_NOT_FOUND"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/invites/nonexistent-slug",
    });

    expect(res.statusCode).toBe(404);
  });

  it("should return 500 when ProjectService throws an unexpected error", async () => {
    mockAcceptInvite.mockRejectedValue(new Error("Database connection failed"));
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "member@test.com", username: "member" };
    });
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/projects/invites/invite-slug-abc123",
    });

    expect(res.statusCode).toBe(500);
  });
});
