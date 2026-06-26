import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockGetProjectSecrets, mockCreateSecret } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetProjectSecrets: vi.fn(),
  mockCreateSecret: vi.fn(),
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
        getProjectSecrets: mockGetProjectSecrets,
        createSecret: mockCreateSecret,
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

const context = { params: Promise.resolve({ id: "proj-1" }) };

function createMockSecret(id: string) {
  return {
    id,
    name: `SECRET_${id}`,
    value: "secret-value",
    notes: "some notes",
    projectId: "proj-1",
    addedById: "user-1",
    updatedById: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
  };
}

describe("GET /api/projects/:id/secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with secrets list", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetProjectSecrets.mockResolvedValue([createMockSecret("sec-1"), createMockSecret("sec-2")]);

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.secrets).toHaveLength(2);
    expect(body.secrets[0].id).toBe("sec-1");
  });

  it("returns 403 when user lacks read access", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetProjectSecrets.mockRejectedValue(ApiError.Forbidden());

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });
});

describe("POST /api/projects/:id/secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/secrets", {
        method: "POST",
        body: JSON.stringify({ name: "API_KEY", value: "secret123" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when name or value is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/secrets", {
        method: "POST",
        body: JSON.stringify({ name: "API_KEY" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Name and value are required.");
  });

  it("returns 201 on successful creation", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    const secret = createMockSecret("sec-new");
    mockCreateSecret.mockResolvedValue(secret);

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/secrets", {
        method: "POST",
        body: JSON.stringify({ name: "API_KEY", value: "secret123", notes: "test notes" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.secret.name).toBe("SECRET_sec-new");
    expect(body.secret.value).toBe("secret-value");
  });

  it("returns 403 when the requester lacks write access", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockCreateSecret.mockRejectedValue(ApiError.Forbidden());

    const response = await POST(
      new Request("http://localhost/api/projects/proj-1/secrets", {
        method: "POST",
        body: JSON.stringify({ name: "API_KEY", value: "secret123" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });
});
