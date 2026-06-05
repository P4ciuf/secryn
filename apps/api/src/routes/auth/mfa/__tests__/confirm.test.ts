import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { AppError } from "../../../../core/errors/appError.js";
import route from "../confirm.route.js";

const { mockConfirmMFA, MockAuthService } = vi.hoisted(() => {
  const mockConfirmMFA = vi.fn();
  function MockAuthService(this: Record<string, unknown>) {
    this.confirmMFA = mockConfirmMFA;
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
  return { mockConfirmMFA, MockAuthService };
});

vi.mock("../../../../core/auth/service.js", () => ({
  AuthService: MockAuthService,
}));

function buildApp() {
  const app = Fastify({ ajv: { customOptions: { strict: false } } });
  app.register(cookie);
  app.route(route(app));
  return app;
}

describe("POST /auth/mfa/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with ok:true and set auth cookie on valid TOTP", async () => {
    mockConfirmMFA.mockResolvedValue("jwt-token-value");
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: { token: "123456", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]?.name).toBe("auth-token");
    expect(res.cookies[0]?.value).toBe("jwt-token-value");
  });

  it("should return 400 when token is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: { mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when mfaToken is missing", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: { token: "123456" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 400 when body is empty", async () => {
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 401 when TOTP code is invalid", async () => {
    mockConfirmMFA.mockRejectedValue(new AppError("Invalid TOTP code", 401, "UNAUTHORIZED"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: { token: "000000", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 401 when MFA token is expired", async () => {
    mockConfirmMFA.mockRejectedValue(
      new AppError("Invalid or expired MFA token", 401, "UNAUTHORIZED"),
    );
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: { token: "123456", mfaToken: "expired-token" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should return 500 when AuthService throws an unexpected error", async () => {
    mockConfirmMFA.mockRejectedValue(new Error("JWT signing failed"));
    const app = buildApp();

    const res = await app.inject({
      method: "POST",
      url: "/auth/mfa/confirm",
      payload: { token: "123456", mfaToken: "mfa-token-string" },
    });

    expect(res.statusCode).toBe(500);
  });
});
