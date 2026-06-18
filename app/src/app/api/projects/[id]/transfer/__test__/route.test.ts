import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockTransferOwnerProject } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockTransferOwnerProject: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/project", () => ({
  ProjectService: {
    Instance: () =>
      Promise.resolve({
        transferOwnerProject: mockTransferOwnerProject,
      }),
  },
}));

import { POST } from "../route";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "USER" as const,
};

const context = { params: Promise.resolve({ id: "proj-1" }) };

function createMockProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj-1",
    name: "Test Project",
    slug: "test-project",
    ownerId: "user-2",
    ...overrides,
  };
}

describe("POST /api/projects/:id/transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/transfer", {
        method: "POST",
        body: JSON.stringify({ toUserId: "user-2" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when toUserId is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/transfer", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("toUserId is required.");
  });

  it("returns 200 on successful transfer", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockTransferOwnerProject.mockResolvedValue(createMockProject());

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/transfer", {
        method: "POST",
        body: JSON.stringify({ toUserId: "user-2" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.project.ownerId).toBe("user-2");
  });

  it("returns 403 when user is not the owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockTransferOwnerProject.mockRejectedValue(ApiError.Forbidden());

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/transfer", {
        method: "POST",
        body: JSON.stringify({ toUserId: "user-2" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });
});
