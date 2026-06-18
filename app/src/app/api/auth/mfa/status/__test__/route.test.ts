import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const { mockGetAuthenticatedUser, mockGetUserOrThrow } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetUserOrThrow: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        getUserOrThrow: mockGetUserOrThrow,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

function buildRequest(): Request {
  return new Request("http://localhost/api/auth/mfa/status", {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/mfa/status", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with MFA disabled status", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserOrThrow.mockResolvedValue({
      ...mockUser,
      isMFAEnabled: false,
    });

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.enabled).toBe(false);
    expect(mockGetUserOrThrow).toHaveBeenCalledWith({ id: "user-1" });
  });

  it("returns 200 with MFA enabled status", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserOrThrow.mockResolvedValue({
      ...mockUser,
      isMFAEnabled: true,
    });

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.enabled).toBe(true);
  });
});
