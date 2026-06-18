import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";
import { ProjectMemberPermission } from "@prisma/client";

const { mockGetAuthenticatedUser, mockAddPermissionsToMember, mockRemovePermissionsFromMember } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockAddPermissionsToMember: vi.fn(),
    mockRemovePermissionsFromMember: vi.fn(),
  }));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/project", () => ({
  ProjectService: {
    Instance: () =>
      Promise.resolve({
        addPermissionsToMember: mockAddPermissionsToMember,
        removePermissionsFromMember: mockRemovePermissionsFromMember,
      }),
  },
}));

import { PUT } from "../route";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "USER" as const,
};

const context = { params: Promise.resolve({ id: "proj-1", memberId: "mem-1" }) };

describe("PUT /api/projects/:id/members/:memberId/permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/members/mem-1/permissions", {
        method: "PUT",
        body: JSON.stringify({ addPermissions: ["READ_SECRETS"] }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 when adding permissions", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockAddPermissionsToMember.mockResolvedValue(undefined);

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/members/mem-1/permissions", {
        method: "PUT",
        body: JSON.stringify({ addPermissions: ["READ_SECRETS", "CREATE_SECRETS"] }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAddPermissionsToMember).toHaveBeenCalledWith("mem-1", "proj-1", [
      ProjectMemberPermission.READ_SECRETS,
      ProjectMemberPermission.CREATE_SECRETS,
    ]);
  });

  it("returns 200 when removing permissions", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockRemovePermissionsFromMember.mockResolvedValue(undefined);

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/members/mem-1/permissions", {
        method: "PUT",
        body: JSON.stringify({ removePermissions: ["READ_SECRETS"] }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRemovePermissionsFromMember).toHaveBeenCalledWith("mem-1", "proj-1", [
      ProjectMemberPermission.READ_SECRETS,
    ]);
  });

  it("returns 200 when adding and removing permissions simultaneously", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockAddPermissionsToMember.mockResolvedValue(undefined);
    mockRemovePermissionsFromMember.mockResolvedValue(undefined);

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/members/mem-1/permissions", {
        method: "PUT",
        body: JSON.stringify({
          addPermissions: ["READ_SECRETS"],
          removePermissions: ["CREATE_INVITES"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAddPermissionsToMember).toHaveBeenCalledTimes(1);
    expect(mockRemovePermissionsFromMember).toHaveBeenCalledTimes(1);
  });
});
