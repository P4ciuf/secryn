import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../recovery.route.js";

const {
  mockJwtDecode,
  mockJwtSign,
  mockRecoverMFA,
  mockGetUserOrThrow,
  MockAuthService,
  MockUserService,
} = vi.hoisted(() => {
  const mockJwtDecode = vi.fn();
  const mockJwtSign = vi.fn();
  const mockRecoverMFA = vi.fn();
  const mockGetUserOrThrow = vi.fn();

  function MockAuthService(this: Record<string, unknown>) {
    this.recoverMFA = mockRecoverMFA;
  }
  MockAuthService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockAuthService as unknown as new () => object)());
  MockAuthService.cookieConfig = {
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "strict" as const,
    maxAge: 1800,
  };

  function MockUserService(this: Record<string, unknown>) {
    this.getUserOrThrow = mockGetUserOrThrow;
  }
  MockUserService.Instance = vi
    .fn()
    .mockResolvedValue(new (MockUserService as unknown as new () => object)());

  return {
    mockJwtDecode,
    mockJwtSign,
    mockRecoverMFA,
    mockGetUserOrThrow,
    MockAuthService,
    MockUserService,
  };
});

vi.mock("../../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

vi.mock("../../../../modules/user/service.js", () => ({
  UserService: MockUserService,
}));

vi.mock("../../../../utils/redis.js", () => ({
  consumeEmailBackupCode: vi.fn().mockResolvedValue(false),
}));

import { consumeEmailBackupCode } from "../../../../utils/redis.js";

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.decorate("jwt", {
    decode: mockJwtDecode,
    sign: mockJwtSign,
    verify: vi.fn(),
  } as any);
  app.route(route(app));
  return app;
}

describe("POST /auth/mfa/recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true and set auth cookie on valid DB recovery code", async () => {
    mockJwtDecode.mockReturnValue(null);
    mockRecoverMFA.mockResolvedValue("recovered-jwt-token");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { code: "a1b2c3d4e5f6", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]?.name).toBe("auth-token");
    expect(res.cookies[0]?.value).toBe("recovered-jwt-token");
  });

  it("should return 200 with ok:true on valid email backup code from Redis", async () => {
    mockJwtDecode.mockReturnValue({ email: "user@test.com", userId: "user_001", mfaPending: true });
    vi.mocked(consumeEmailBackupCode).mockResolvedValue(true);
    mockGetUserOrThrow.mockResolvedValue({
      id: "user_001",
      email: "user@test.com",
      username: "testuser",
    });
    mockJwtSign.mockReturnValue("email-jwt-token");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { code: "email-code", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies[0]?.value).toBe("email-jwt-token");
  });

  it("should fall back to DB when Redis email code is not found", async () => {
    mockJwtDecode.mockReturnValue({ email: "user@test.com", userId: "user_001", mfaPending: true });
    vi.mocked(consumeEmailBackupCode).mockResolvedValue(false);
    mockRecoverMFA.mockResolvedValue("db-jwt-token");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { code: "db-code", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.cookies[0]?.value).toBe("db-jwt-token");
  });

  it("should return 400 when code is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when mfaToken is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { code: "a1b2c3d4e5f6" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when recovery code is invalid (DB fallback)", async () => {
    mockJwtDecode.mockReturnValue(null);
    mockRecoverMFA.mockRejectedValue(
      new AppError("Invalid or already used recovery code", 401, "UNAUTHORIZED"),
    );
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { code: "invalid-code", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockJwtDecode.mockReturnValue(null);
    mockRecoverMFA.mockRejectedValue(new Error("Database connection failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/recovery",
      payload: { code: "a1b2c3d4e5f6", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(500);
  });
});
