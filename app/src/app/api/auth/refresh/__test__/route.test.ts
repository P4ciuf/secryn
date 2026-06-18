import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockRefreshToken, mockSetAuthCookie } = vi.hoisted(() => ({
  mockRefreshToken: vi.fn(),
  mockSetAuthCookie: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        refreshToken: mockRefreshToken,
      }),
  },
}));

vi.mock("@/utils/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

function buildRequest(): Request {
  return new Request("http://localhost/api/auth/refresh", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/refresh", () => {
  it("returns 200 and sets auth cookie on successful refresh", async () => {
    mockRefreshToken.mockResolvedValue("new-jwt-token");

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRefreshToken).toHaveBeenCalled();
    expect(mockSetAuthCookie).toHaveBeenCalledWith("new-jwt-token");
  });

  it("returns 401 when refresh token is invalid or expired", async () => {
    mockRefreshToken.mockRejectedValue(
      new ApiError("Invalid or expired token", 401, "UNAUTHORIZED"),
    );

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(mockSetAuthCookie).not.toHaveBeenCalled();
  });

  it("returns 500 when an unexpected error occurs", async () => {
    mockRefreshToken.mockRejectedValue(new Error("Unexpected error"));

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
