import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "../route";
import { ApiError } from "@/errors/apiError";

const {
  mockGetAuthenticatedUser,
  mockGetApiKeyOrThrow,
  mockUpdateApiKeyName,
  mockUpdateApiKeyStatus,
  mockUpdateApiKeyPermissions,
  mockDeleteApiKeyById,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetApiKeyOrThrow: vi.fn(),
  mockUpdateApiKeyName: vi.fn(),
  mockUpdateApiKeyStatus: vi.fn(),
  mockUpdateApiKeyPermissions: vi.fn(),
  mockDeleteApiKeyById: vi.fn(),
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
        getApiKeyOrThrow: mockGetApiKeyOrThrow,
        updateApiKeyName: mockUpdateApiKeyName,
        updateApiKeyStatus: mockUpdateApiKeyStatus,
        updateApiKeyPermissions: mockUpdateApiKeyPermissions,
        deleteApiKeyById: mockDeleteApiKeyById,
      }),
  },
}));

const mockUser = { id: "user-1", email: "a@b.com", username: "test" };
const mockApiKey = {
  id: "key-1",
  keyName: "test-key",
  key: "sc_abc123",
  userId: "user-1",
  isActive: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  expiresAt: "2025-12-31T00:00:00.000Z",
  permissions: ["read"],
};

function buildCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function buildRequest(body?: unknown): Request {
  return new Request("http://localhost/api/api-keys/key-1", {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/api-keys/:id", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await GET(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with the API key for an authenticated owner", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetApiKeyOrThrow.mockResolvedValue(mockApiKey);

    const res = await GET(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.apiKey).toEqual(mockApiKey);
  });

  it("returns 404 when the API key does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetApiKeyOrThrow.mockRejectedValue(ApiError.ResourceNotFound("Api Key"));

    const res = await GET(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("returns 500 when the service throws an unexpected error", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetApiKeyOrThrow.mockRejectedValue(new Error("Database connection failed"));

    const res = await GET(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe("PUT /api/api-keys/:id", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await PUT(buildRequest({ name: "new-name" }), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("updates the key name and returns 200", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetApiKeyOrThrow.mockResolvedValue({ ...mockApiKey, keyName: "new-name" });

    const res = await PUT(buildRequest({ name: "new-name" }), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdateApiKeyName).toHaveBeenCalledWith("key-1", "new-name");
    expect(body.apiKey.keyName).toBe("new-name");
  });

  it("updates the key status and returns 200", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetApiKeyOrThrow.mockResolvedValue({ ...mockApiKey, isActive: false });

    const res = await PUT(buildRequest({ isActive: false }), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdateApiKeyStatus).toHaveBeenCalledWith("key-1", false);
  });

  it("updates permissions filtering invalid values", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetApiKeyOrThrow.mockResolvedValue({ ...mockApiKey, permissions: ["read", "write"] });

    const res = await PUT(
      buildRequest({ addPermissions: ["read", "write", "admin" as never], removePermissions: [] }),
      buildCtx("key-1"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdateApiKeyPermissions).toHaveBeenCalledWith("key-1", {
      addPermissions: ["read", "write"],
      removePermissions: [],
    });
  });

  it("returns 404 when the key is not found", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockUpdateApiKeyName.mockRejectedValue(ApiError.ResourceNotFound("Api Key"));

    const res = await PUT(buildRequest({ name: "x" }), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });
});

describe("DELETE /api/api-keys/:id", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await DELETE(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(401);
  });

  it("deletes the key and returns 200", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDeleteApiKeyById.mockResolvedValue(undefined);

    const res = await DELETE(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteApiKeyById).toHaveBeenCalledWith("key-1");
  });

  it("returns 404 when the key does not exist", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDeleteApiKeyById.mockRejectedValue(ApiError.ResourceNotFound("Api Key"));

    const res = await DELETE(buildRequest(), buildCtx("key-1"));
    const body = await res.json();

    expect(res.status).toBe(404);
  });
});
