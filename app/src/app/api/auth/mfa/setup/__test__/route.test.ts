import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const { mockGetAuthenticatedUser, mockGenerateTOTPSecret, mockGenerateQRCode } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockGenerateTOTPSecret: vi.fn(),
    mockGenerateQRCode: vi.fn(),
  }));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        generateTOTPSecret: mockGenerateTOTPSecret,
        generateQRCode: mockGenerateQRCode,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

function buildRequest(): Request {
  return new Request("http://localhost/api/auth/mfa/setup", {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/mfa/setup", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with secret, qrCode, and otpauthUrl", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGenerateTOTPSecret.mockReturnValue({
      secret: "SECRET123",
      otpauthUrl: "otpauth://totp/Secryn:test?secret=SECRET123",
    });
    mockGenerateQRCode.mockResolvedValue("data:image/png;base64,...");

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.secret).toBe("SECRET123");
    expect(body.otpauthUrl).toBe("otpauth://totp/Secryn:test?secret=SECRET123");
    expect(body.qrCode).toBe("data:image/png;base64,...");
    expect(mockGenerateQRCode).toHaveBeenCalledWith(
      "otpauth://totp/Secryn:test?secret=SECRET123",
    );
  });
});
