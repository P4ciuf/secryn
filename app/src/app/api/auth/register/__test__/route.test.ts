import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockRegister, mockSetAuthCookie } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockSetAuthCookie: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: {
    Instance: () =>
      Promise.resolve({
        register: mockRegister,
      }),
  },
}));

vi.mock("@/utils/cookie", () => ({
  setAuthCookie: mockSetAuthCookie,
}));

function buildRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(buildRequest({ password: "secret123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(buildRequest({ email: "user@example.com" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 201 on success and sets the auth cookie", async () => {
    mockRegister.mockResolvedValue("jwt-token-abc123");

    const res = await POST(buildRequest({ email: "user@example.com", password: "secret123" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.token).toBe("jwt-token-abc123");
    expect(mockSetAuthCookie).toHaveBeenCalledWith("jwt-token-abc123");
  });

  it("returns 500 on internal error", async () => {
    mockRegister.mockRejectedValue(new Error("Database connection failed"));

    const res = await POST(buildRequest({ email: "user@example.com", password: "secret123" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
