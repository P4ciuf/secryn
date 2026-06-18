import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockDisableMFA } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockDisableMFA: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        disableMFA: mockDisableMFA,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

function buildRequest(): Request {
  return new Request("http://localhost/api/auth/mfa/disable", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/mfa/disable", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 when MFA is successfully disabled", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDisableMFA.mockResolvedValue(undefined);

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDisableMFA).toHaveBeenCalledWith("user-1");
  });

  it("returns 500 when the service throws an unexpected error", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDisableMFA.mockRejectedValue(new Error("Database error"));

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
