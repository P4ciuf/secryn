import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockGetProjectOrThrow } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetProjectOrThrow: vi.fn(),
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
        getProjectOrThrow: mockGetProjectOrThrow,
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

function createMockProject(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj-1",
    name: "Test Project",
    slug: "test-project",
    ownerId: "user-1",
    members: [
      {
        id: "mem-1",
        userId: "user-1",
        projectId: "proj-1",
        joinedAt: new Date("2024-01-01"),
      },
      {
        id: "mem-2",
        userId: "user-2",
        projectId: "proj-1",
        joinedAt: new Date("2024-02-01"),
      },
    ],
    ...overrides,
  };
}

const context = { params: Promise.resolve({ id: "proj-1" }) };

describe("GET /api/projects/:id/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/members"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with members list when user is the owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetProjectOrThrow.mockResolvedValue(createMockProject());

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/members"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.members).toHaveLength(2);
  });

  it("returns 200 when user is a member but not the owner", async () => {
    const otherUser = { ...mockUser, id: "user-2" };
    mockGetAuthenticatedUser.mockResolvedValue(otherUser);
    mockGetProjectOrThrow.mockResolvedValue(createMockProject());

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/members"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 403 when user is not a member or owner", async () => {
    const outsider = { ...mockUser, id: "user-99" };
    mockGetAuthenticatedUser.mockResolvedValue(outsider);
    mockGetProjectOrThrow.mockResolvedValue(createMockProject());

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/members"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("returns 404 when the project does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetProjectOrThrow.mockRejectedValue(ApiError.ResourceNotFound("Project"));

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/members"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});
