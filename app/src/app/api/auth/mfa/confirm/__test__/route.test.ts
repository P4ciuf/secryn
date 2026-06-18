import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockConfirmMFA, mockSetAuthCookie } = vi.hoisted(() => ({
  mockConfirmMFA: vi.fn(),
  mockSetAuthCookie: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        confirmMFA: mockConfirmMFA,
      }),
  },
}));

vi.mock("@/utils/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/mfa/confirm", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/mfa/confirm", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(buildRequest({ mfaToken: "123456" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when mfaToken is missing", async () => {
    const res = await POST(buildRequest({ token: "temp-token" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 200 and sets auth cookie on successful MFA confirmation", async () => {
    mockConfirmMFA.mockResolvedValue("valid-jwt-token");

    const res = await POST(
      buildRequest({ token: "temp-token", mfaToken: "123456" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockConfirmMFA).toHaveBeenCalledWith("temp-token", "123456");
    expect(mockSetAuthCookie).toHaveBeenCalledWith("valid-jwt-token");
  });

  it("returns 401 when MFA confirmation fails", async () => {
    mockConfirmMFA.mockRejectedValue(
      new ApiError("Invalid MFA code", 401, "UNAUTHORIZED"),
    );

    const res = await POST(
      buildRequest({ token: "temp-token", mfaToken: "wrong" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(mockSetAuthCookie).not.toHaveBeenCalled();
  });
});
