import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const { mockGetAuthenticatedUser, mockGetRecoveryCodePlaceholders } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetRecoveryCodePlaceholders: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        getRecoveryCodePlaceholders: mockGetRecoveryCodePlaceholders,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

function buildRequest(): Request {
  return new Request("http://localhost/api/auth/mfa/recovery-codes", {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/mfa/recovery-codes", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with recovery code placeholders", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetRecoveryCodePlaceholders.mockResolvedValue(["****-****-****", "****-****-****"]);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.codes).toEqual(["****-****-****", "****-****-****"]);
    expect(mockGetRecoveryCodePlaceholders).toHaveBeenCalledWith("user-1");
  });

  it("returns 200 with empty array when no recovery codes exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetRecoveryCodePlaceholders.mockResolvedValue([]);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.codes).toEqual([]);
  });
});
