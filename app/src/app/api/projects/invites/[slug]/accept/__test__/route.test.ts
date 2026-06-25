import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockAcceptInvite } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockAcceptInvite: vi.fn(),
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
        acceptInvite: mockAcceptInvite,
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

const context = { params: Promise.resolve({ slug: "abc123" }) };

describe("POST /api/projects/invites/:slug/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/projects/invites/abc123/accept", {
        method: "POST",
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 on successful invite acceptance", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockAcceptInvite.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/projects/invites/abc123/accept", {
        method: "POST",
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
