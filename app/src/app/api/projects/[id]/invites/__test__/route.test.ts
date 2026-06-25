import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockCreateInvite } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockCreateInvite: vi.fn(),
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
        createInvite: mockCreateInvite,
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

describe("POST /api/projects/:id/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/invites", {
        method: "POST",
        body: JSON.stringify({ email: "invitee@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when email is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/invites", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Email is required.");
  });

  it("returns 201 on successful invite creation", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    const invite = {
      id: "inv-1",
      slug: "abc123",
      projectId: "proj-1",
      expiresAt: new Date("2024-06-01"),
      createdAt: new Date("2024-01-01"),
    };
    mockCreateInvite.mockResolvedValue(invite);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/invites", {
        method: "POST",
        body: JSON.stringify({ email: "invitee@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.invite.id).toBe("inv-1");
    expect(body.invite.slug).toBe("abc123");
  });
});
