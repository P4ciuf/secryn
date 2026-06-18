import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockVerifyTOTP, mockEnableMFA } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockVerifyTOTP: vi.fn(),
    mockEnableMFA: vi.fn(),
  }));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        verifyTOTP: mockVerifyTOTP,
        enableMFA: mockEnableMFA,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

function buildRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/mfa/enable", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/mfa/enable", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(
      buildRequest({ token: "123456", secret: "SECRET123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when token is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const res = await POST(buildRequest({ secret: "SECRET123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when secret is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const res = await POST(buildRequest({ token: "123456" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 401 when TOTP code is invalid", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockVerifyTOTP.mockResolvedValue(false);

    const res = await POST(
      buildRequest({ token: "wrong", secret: "SECRET123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(mockVerifyTOTP).toHaveBeenCalledWith("wrong", "SECRET123");
    expect(mockEnableMFA).not.toHaveBeenCalled();
  });

  it("returns 200 with recovery codes on successful MFA enable", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockVerifyTOTP.mockResolvedValue(true);
    mockEnableMFA.mockResolvedValue(["code-1", "code-2", "code-3"]);

    const res = await POST(
      buildRequest({ token: "123456", secret: "SECRET123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.recoveryCodes).toEqual(["code-1", "code-2", "code-3"]);
    expect(mockVerifyTOTP).toHaveBeenCalledWith("123456", "SECRET123");
    expect(mockEnableMFA).toHaveBeenCalledWith("user-1", "SECRET123");
  });
});
