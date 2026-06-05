import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import { registerErrorHandler } from "../../../../core/errors/errorHandler.js";
import route from "../send-backup-code.route.js";

const { mockJwtVerify, mockSendBackupCodeEmail, MockUserService } = vi.hoisted(() => {
  const mockJwtVerify = vi.fn();
  const mockSendBackupCodeEmail = vi.fn();
  function MockUserService(this: Record<string, unknown>) {
    this.sendBackupCodeEmail = mockSendBackupCodeEmail;
  }
  MockUserService.Instance = async (_userId: string) =>
    new (MockUserService as unknown as new () => object)();
  return { mockJwtVerify, mockSendBackupCodeEmail, MockUserService };
});

vi.mock("../../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

vi.mock("../../../../utils/redis.js", () => ({
  storeEmailBackupCode: vi.fn().mockResolvedValue(undefined),
  consumeEmailBackupCode: vi.fn().mockResolvedValue(false),
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  registerErrorHandler(app);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate("jwt", { verify: mockJwtVerify } as any);
  app.route(route(app));
  return app;
}

describe("POST /auth/mfa/send-backup-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true on valid MFA token", async () => {
    mockJwtVerify.mockReturnValue({ userId: "user_001", mfaPending: true, email: "user@test.com" });
    mockSendBackupCodeEmail.mockResolvedValue(undefined);
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/send-backup-code",
      payload: { mfaToken: "valid-mfa-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSendBackupCodeEmail).toHaveBeenCalledOnce();
  });

  it("should return 400 when mfaToken is missing from body", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/send-backup-code",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when MFA token is expired or invalid", async () => {
    mockJwtVerify.mockImplementation(() => {
      throw new Error("Invalid token");
    });
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/send-backup-code",
      payload: { mfaToken: "expired-token" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when an unexpected error occurs", async () => {
    mockJwtVerify.mockReturnValue({ userId: "user_001", mfaPending: true, email: "user@test.com" });
    mockSendBackupCodeEmail.mockRejectedValue(new Error("Email service unavailable"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/send-backup-code",
      payload: { mfaToken: "valid-mfa-token" },
    });

    expect(res.statusCode).toBe(500);
  });
});
