import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockRecoverMFA, mockSetAuthCookie } = vi.hoisted(() => ({
  mockRecoverMFA: vi.fn(),
  mockSetAuthCookie: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        recoverMFA: mockRecoverMFA,
      }),
  },
}));

vi.mock("@/utils/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/mfa/recovery", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/mfa/recovery", () => {
  it("returns 400 when code is missing", async () => {
    const res = await POST(buildRequest({ mfaToken: "mfa-token" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when mfaToken is missing", async () => {
    const res = await POST(buildRequest({ code: "recovery-code" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 200 and sets auth cookie on successful recovery", async () => {
    mockRecoverMFA.mockResolvedValue("valid-jwt-token");

    const res = await POST(buildRequest({ code: "recovery-code", mfaToken: "mfa-token" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRecoverMFA).toHaveBeenCalledWith("recovery-code", "mfa-token");
    expect(mockSetAuthCookie).toHaveBeenCalledWith("valid-jwt-token");
  });

  it("returns 401 when recovery code is invalid", async () => {
    mockRecoverMFA.mockRejectedValue(new ApiError("Invalid recovery code", 401, "UNAUTHORIZED"));

    const res = await POST(buildRequest({ code: "bad-code", mfaToken: "mfa-token" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(mockSetAuthCookie).not.toHaveBeenCalled();
  });
});
