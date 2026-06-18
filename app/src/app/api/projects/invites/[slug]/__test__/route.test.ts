import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockFindProjectInvite } = vi.hoisted(() => ({
  mockFindProjectInvite: vi.fn(),
}));

vi.mock("@/repositories/project", () => ({
  projectRepository: {
    findProjectInvite: mockFindProjectInvite,
  },
}));

import { GET } from "../route";

const context = { params: Promise.resolve({ slug: "abc123" }) };

function createMockInvite() {
  return {
    id: "inv-1",
    slug: "abc123",
    projectId: "proj-1",
    expiresAt: new Date("2024-06-01"),
    createdAt: new Date("2024-01-01"),
  };
}

describe("GET /api/projects/invites/:slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with invite details", async () => {
    mockFindProjectInvite.mockResolvedValue(createMockInvite());

    const response = await GET(
      new Request("http://localhost/api/projects/invites/abc123"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.invite.id).toBe("inv-1");
    expect(body.invite.slug).toBe("abc123");
  });

  it("returns 404 when invite not found", async () => {
    mockFindProjectInvite.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/projects/invites/abc123"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});
