import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { ApiError } from "@/errors/apiError";

const { mockGetAuthenticatedUser, mockGetUserApiKeys, mockGenerateApiKey } = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetUserApiKeys: vi.fn(),
  mockGenerateApiKey: vi.fn(),
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

vi.mock("@/services/apiKey", () => ({
  ApiKeyService: {
    Instance: () =>
      Promise.resolve({
        getUserApiKeys: mockGetUserApiKeys,
        generateApiKey: mockGenerateApiKey,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };

const mockApiKey = {
  id: "key-1",
  keyName: "test-key",
  key: "sc_abc123def456",
  userId: "user-1",
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  expiresAt: "2025-12-31T00:00:00.000Z",
  permissions: ["read"] as const,
};

function buildRequest(init?: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const hasBody = init?.body !== undefined;
  return new Request("http://localhost/api/api-keys", {
    method: init?.method ?? "GET",
    body: hasBody ? JSON.stringify(init.body) : undefined,
    headers: hasBody ? { "Content-Type": "application/json", ...init?.headers } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/api-keys", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with an empty array when user has no API keys", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserApiKeys.mockResolvedValue([]);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.apiKeys).toEqual([]);
  });

  it("returns 200 with the list of API keys for the authenticated user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserApiKeys.mockResolvedValue([mockApiKey]);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.apiKeys).toEqual([mockApiKey]);
  });

  it("returns 500 when the service throws an unexpected error", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserApiKeys.mockRejectedValue(new Error("Database connection failed"));

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe("POST /api/api-keys", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { name: "my-key", permissions: ["read"] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when name is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { permissions: ["read"] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
    expect(body.message).toBe("Name and at least one permission are required.");
  });

  it("returns 400 when permissions is missing", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { name: "my-key" },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 400 when permissions array is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { name: "my-key", permissions: [] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("returns 400 when permissions contain invalid values", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { name: "my-key", permissions: ["read", "admin"] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("BAD_REQUEST");
    expect(body.message).toContain("Invalid permission: admin");
  });

  it("returns 201 with the created API key on success", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGenerateApiKey.mockResolvedValue(mockApiKey);

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { name: "my-key", permissions: ["read", "write"] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.apiKey).toEqual(mockApiKey);
    expect(mockGenerateApiKey).toHaveBeenCalledWith({
      name: "my-key",
      permissions: ["read", "write"],
    });
  });

  it("returns 500 when the service throws an unexpected error", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGenerateApiKey.mockRejectedValue(new Error("Database connection failed"));

    const res = await POST(
      buildRequest({
        method: "POST",
        body: { name: "my-key", permissions: ["read"] },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
