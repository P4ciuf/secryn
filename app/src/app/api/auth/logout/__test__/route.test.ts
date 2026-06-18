import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const { mockClearAuthCookie } = vi.hoisted(() => ({
  mockClearAuthCookie: vi.fn(),
}));

vi.mock("@/utils/cookie", () => ({
  clearAuthCookie: mockClearAuthCookie,
}));

function buildRequest(): Request {
  return new Request("http://localhost/api/auth/logout", {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the auth cookie", async () => {
    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockClearAuthCookie).toHaveBeenCalled();
  });
});
