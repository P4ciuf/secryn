import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const { mockGetAuthenticatedUser, mockRegenerateRecoveryCodes } = vi.hoisted(
  () => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockRegenerateRecoveryCodes: vi.fn(),
  }),
);

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        regenerateRecoveryCodes: mockRegenerateRecoveryCodes,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

function buildRequest(): Request {
  return new Request(
    "http://localhost/api/auth/mfa/recovery-codes/regenerate",
    {
      method: "POST",
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/mfa/recovery-codes/regenerate", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when MFA is not enabled (service returns null)", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockRegenerateRecoveryCodes.mockResolvedValue(null);

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
    expect(body.message).toBe("MFA is not enabled.");
  });

  it("returns 200 with new recovery codes", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockRegenerateRecoveryCodes.mockResolvedValue(["new-1", "new-2", "new-3"]);

    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.recoveryCodes).toEqual(["new-1", "new-2", "new-3"]);
    expect(mockRegenerateRecoveryCodes).toHaveBeenCalledWith("user-1");
  });
});
