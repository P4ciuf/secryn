import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockGetUserProjects, mockCreateProject } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetUserProjects: vi.fn(),
  mockCreateProject: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/project", () => ({
  ProjectService: {
    Instance: () =>
      Promise.resolve({
        getUserProjects: mockGetUserProjects,
        createProject: mockCreateProject,
      }),
  },
}));

import { GET, POST } from "../route";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "USER" as const,
};

function createMockProject(id: string) {
  return {
    id,
    name: `Project ${id}`,
    slug: `project-${id}`,
    description: "A test project",
    ownerId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
  };
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/projects"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with projects list", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserProjects.mockResolvedValue([
      createMockProject("proj-1"),
      createMockProject("proj-2"),
    ]);

    const response = await GET(new Request("http://localhost/api/projects"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.projects).toHaveLength(2);
    expect(body.projects[0].id).toBe("proj-1");
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when name is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Project name is required.");
  });

  it("returns 201 on successful creation", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    const project = createMockProject("proj-new");
    mockCreateProject.mockResolvedValue(project);

    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "New Project", description: "A new project" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.project.name).toBe("Project proj-new");
    expect(body.project.slug).toBe("project-proj-new");
  });
});
