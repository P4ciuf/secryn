import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockResetPassword } = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        resetPassword: mockResetPassword,
      }),
  },
}));

function buildRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(buildRequest({ password: "newpass123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(buildRequest({ token: "reset-token-abc" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 200 on success", async () => {
    mockResetPassword.mockResolvedValue({ message: "Password has been reset." });

    const res = await POST(buildRequest({ token: "reset-token-abc", password: "newpass123" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockResetPassword).toHaveBeenCalledWith({ token: "reset-token-abc", password: "newpass123" });
  });

  it("returns 500 on internal error", async () => {
    mockResetPassword.mockRejectedValue(new Error("Database connection failed"));

    const res = await POST(buildRequest({ token: "reset-token-abc", password: "newpass123" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
