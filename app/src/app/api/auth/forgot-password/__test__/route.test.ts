import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockForgotPassword } = vi.hoisted(() => ({
  mockForgotPassword: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        forgotPassword: mockForgotPassword,
      }),
  },
}));

function buildRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(buildRequest({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 200 on success (anti-enumeration)", async () => {
    mockForgotPassword.mockResolvedValue({
      message: "If the email exists, a reset link has been sent.",
    });

    const res = await POST(buildRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockForgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("returns 500 on internal error", async () => {
    mockForgotPassword.mockRejectedValue(new Error("Database connection failed"));

    const res = await POST(buildRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
