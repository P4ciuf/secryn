import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockGetSecretOrThrow, mockUpdateSecret, mockDeleteSecret } =
  vi.hoisted(() => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockGetSecretOrThrow: vi.fn(),
    mockUpdateSecret: vi.fn(),
    mockDeleteSecret: vi.fn(),
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
        getSecretOrThrow: mockGetSecretOrThrow,
        updateSecret: mockUpdateSecret,
        deleteSecret: mockDeleteSecret,
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

const context = { params: Promise.resolve({ secretId: "sec-1" }) };

function createMockSecret(overrides: Record<string, unknown> = {}) {
  return {
    id: "sec-1",
    name: "API_KEY",
    value: "my-secret-value",
    notes: "test notes",
    projectId: "proj-1",
    addedById: "user-1",
    updatedById: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

describe("GET /api/projects/:id/secrets/:secretId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with secret details", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetSecretOrThrow.mockResolvedValue(createMockSecret());

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.secret.id).toBe("sec-1");
    expect(body.secret.value).toBe("my-secret-value");
  });

  it("returns 404 when secret not found", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetSecretOrThrow.mockRejectedValue(ApiError.ResourceNotFound("Secret"));

    const response = await GET(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1"),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});

describe("PUT /api/projects/:id/secrets/:secretId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1", {
        method: "PUT",
        body: JSON.stringify({ name: "UPDATED_KEY", value: "new-value" }),
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
    mockUpdateSecret.mockResolvedValue(
      createMockSecret({ name: "UPDATED_KEY", value: "new-value" }),
    );

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1", {
        method: "PUT",
        body: JSON.stringify({ name: "UPDATED_KEY", value: "new-value" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.secret.name).toBe("UPDATED_KEY");
  });

  it("returns 404 when the secret does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockUpdateSecret.mockRejectedValue(ApiError.ResourceNotFound("Secret"));

    const response = await PUT(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1", {
        method: "PUT",
        body: JSON.stringify({ name: "UPDATED_KEY", value: "new-value" }),
        headers: { "Content-Type": "application/json" },
      }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});

describe("DELETE /api/projects/:id/secrets/:secretId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 on successful deletion", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDeleteSecret.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 404 when the secret does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDeleteSecret.mockRejectedValue(ApiError.ResourceNotFound("Secret"));

    const response = await DELETE(
      new Request("http://localhost/api/projects/proj-1/secrets/sec-1", { method: "DELETE" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});
