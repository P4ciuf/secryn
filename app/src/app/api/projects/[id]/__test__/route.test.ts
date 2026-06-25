import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockGetProject, mockUpdateProject, mockDeleteProject } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockGetProject: vi.fn(),
    mockUpdateProject: vi.fn(),
    mockDeleteProject: vi.fn(),
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
        getProject: mockGetProject,
        updateProject: mockUpdateProject,
        deleteProject: mockDeleteProject,
      }),
  },
}));

import { GET, PUT, DELETE } from "../route";

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
    description: "A test project",
    ownerId: "user-1",
    members: [
      {
        id: "mem-1",
        userId: "user-1",
        projectId: "proj-1",
        joinedAt: new Date("2024-01-01"),
      },
    ],
    secrets: [
      {
        id: "sec-1",
        name: "API_KEY",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      },
    ],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

const context = { params: Promise.resolve({ id: "proj-1" }) };

describe("GET /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/projects/proj-1"), context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with project details", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetProject.mockResolvedValue(createMockProject());

    const response = await GET(new Request("http://localhost/api/projects/proj-1"), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.project.id).toBe("proj-1");
    expect(body.project.members).toHaveLength(1);
    expect(body.project.secrets).toHaveLength(1);
  });

  it("returns 404 when project not found", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetProject.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/projects/proj-1"), context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});

describe("PUT /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 on successful update", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockUpdateProject.mockResolvedValue(createMockProject({ name: "Updated Project" }));

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Project" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.project.name).toBe("Updated Project");
  });

  it("returns 403 when user is not the owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockUpdateProject.mockRejectedValue(ApiError.Forbidden());

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });
});

describe("DELETE /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 on successful deletion", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDeleteProject.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 403 when user is not the owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDeleteProject.mockRejectedValue(ApiError.Forbidden());

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });
});
