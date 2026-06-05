import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../setup.route.js";

const { mockAuthenticate, mockSetupMFA, MockUserService } = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const mockSetupMFA = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.setupMFA = mockSetupMFA;
  }
  MockUserService.Instance = async (_userId: string) =>
    new (MockUserService as unknown as new () => object)();
  return { mockAuthenticate, mockSetupMFA, MockUserService };
});

vi.mock("../../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.decorate("authenticate", mockAuthenticate);
  app.route(route(app));
  return app;
}

const setupResponse = {
  secret: "JBSWY3DPEHPK3PXP",
  qrCode: "data:image/png;base64,iVBORw0KGgoAAAANS...",
  otpauthUrl: "otpauth://totp/SecureVault:user@test.com?secret=JBSWY3DPEHPK3PXP",
};

describe("GET /auth/mfa/setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with secret, qrCode, and otpauthUrl when authenticated", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockSetupMFA.mockResolvedValue(setupResponse);
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/setup",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(setupResponse);
  });

  it("should return 401 when no auth cookie is present", async () => {
    mockAuthenticate.mockRejectedValue(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/setup",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 409 when MFA is already enabled", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockSetupMFA.mockRejectedValue(new AppError("MFA is already enabled", 409, "CONFLICT"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/setup",
    });

    expect(res.statusCode).toBe(409);
  });

  it("should return 500 when UserService throws an unexpected error", async () => {
    mockAuthenticate.mockImplementation(async (req: Record<string, unknown>) => {
      req.user = { id: "user_001", email: "user@test.com", username: "testuser" };
    });
    mockSetupMFA.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "GET",
      url: "/auth/mfa/setup",
    });

    expect(res.statusCode).toBe(500);
  });
});
