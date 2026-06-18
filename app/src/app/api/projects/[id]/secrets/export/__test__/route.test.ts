import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockExportProjectSecrets } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockExportProjectSecrets: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/project", () => ({
  ProjectService: {
    Instance: () =>
      Promise.resolve({
        exportProjectSecrets: mockExportProjectSecrets,
      }),
  },
}));

import { GET } from "../route";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "USER" as const,
};

const context = { params: Promise.resolve({ id: "proj-1" }) };

describe("GET /api/projects/:id/secrets/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets/export"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with text content", async () => {
    const envContent = "API_KEY=secret123\nDB_URL=postgres://localhost";
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockExportProjectSecrets.mockResolvedValue(envContent);

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets/export"),
      context,
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="secrets-proj-1.env"',
    );
    expect(text).toBe(envContent);
  });

  it("returns 403 when user lacks read access", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockExportProjectSecrets.mockRejectedValue(ApiError.Forbidden());

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets/export"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });
});
