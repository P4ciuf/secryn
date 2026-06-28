import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockRemoveMemberToProject } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockRemoveMemberToProject: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi
    .fn()
    .mockImplementation(() =>
      mockGetAuthenticatedUser().then((u: unknown) => (u ? { user: u } : null)),
    ),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

vi.mock("@/services/project", () => ({
  ProjectService: {
    Instance: () =>
      Promise.resolve({
        removeMemberToProject: mockRemoveMemberToProject,
      }),
  },
}));

import { DELETE } from "../route";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "USER" as const,
};

const context = { params: Promise.resolve({ id: "proj-1", memberId: "mem-1" }) };

describe("DELETE /api/projects/:id/members/:memberId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/members/mem-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 on successful member removal", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockRemoveMemberToProject.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/members/mem-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 403 when user is not an admin", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockRemoveMemberToProject.mockRejectedValue(ApiError.Forbidden());

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/members/mem-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("returns 404 when the member or project does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockRemoveMemberToProject.mockRejectedValue(ApiError.ResourceNotFound("Member"));

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/members/mem-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});
