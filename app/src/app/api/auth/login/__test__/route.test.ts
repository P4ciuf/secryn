import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockLogin, mockSetAuthCookie } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSetAuthCookie: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        login: mockLogin,
      }),
  },
}));

vi.mock("@/utils/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

function buildRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(buildRequest({ password: "secret" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(buildRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 200 when login returns a JWT token string", async () => {
    mockLogin.mockResolvedValue("jwt-token-abc123");

    const res = await POST(buildRequest({ email: "user@example.com", password: "secret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSetAuthCookie).toHaveBeenCalledWith("jwt-token-abc123");
  });

  it("returns 200 when login returns an MFA response", async () => {
    mockLogin.mockResolvedValue({ mfaRequired: true, tempToken: "temp-xyz" });

    const res = await POST(buildRequest({ email: "user@example.com", password: "secret" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mfaRequired).toBe(true);
    expect(mockSetAuthCookie).not.toHaveBeenCalled();
  });

  it("returns 500 on internal error", async () => {
    mockLogin.mockRejectedValue(new Error("Database connection failed"));

    const res = await POST(buildRequest({ email: "user@example.com", password: "secret" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
