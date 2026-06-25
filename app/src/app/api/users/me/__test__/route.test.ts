import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/errors/apiError";

const {
  mockGetAuthenticatedUser,
  mockGetUserOrThrow,
  mockUpdateUser,
  mockDeleteUser,
  mockGetUser,
  mockHashPassword,
  mockComparePassword,
  mockClearAuthCookie,
} = vi.hoisted(() => ({
  mockGetAuthenticatedUser: vi.fn(),
  mockGetUserOrThrow: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockGetUser: vi.fn(),
  mockHashPassword: vi.fn(),
  mockComparePassword: vi.fn(),
  mockClearAuthCookie: vi.fn(),
}));

vi.mock("@/utils/authGuard", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/services/user", () => ({
  UserService: {
    Instance: () =>
      Promise.resolve({
        getUserOrThrow: mockGetUserOrThrow,
        updateUser: mockUpdateUser,
        deleteUser: mockDeleteUser,
        getUser: mockGetUser,
      }),
    hashPassword: mockHashPassword,
    comparePassword: mockComparePassword,
  },
}));

vi.mock("@/utils/cookie", () => ({
  clearAuthCookie: mockClearAuthCookie,
}));

import { GET, PUT, DELETE } from "../route";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  role: "USER" as const,
};

function createMockFullUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    password: "hashed-password",
    role: "USER",
    isVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    ...overrides,
  };
}

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/users/me"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with user profile", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserOrThrow.mockResolvedValue(createMockFullUser());

    const response = await GET(new Request("http://localhost/api/users/me"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.id as string).toBe("user-1");
    expect(body.user.email).toBe("test@example.com");
  });
});

describe("PUT /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ name: "newname" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 400 when no changes are provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserOrThrow.mockResolvedValue(createMockFullUser());
    mockGetUser.mockResolvedValue(null);

    const response = await PUT(
      new Request("http://localhost/api/users/me", {
        method: "PUT",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("No changes provided.");
  });

  it("returns 200 on successful update", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    const currentUser = createMockFullUser();
    mockGetUserOrThrow.mockResolvedValue(currentUser);
    mockGetUser.mockResolvedValue(null);
    const updatedUser = createMockFullUser({ username: "newname" });
    mockUpdateUser.mockResolvedValue(updatedUser);

    const response = await PUT(
      new Request("http://localhost/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ name: "newname" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("newname");
  });
});

describe("DELETE /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/users/me", { method: "DELETE" }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 on successful account deletion", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockGetUserOrThrow.mockResolvedValue(createMockFullUser());
    mockDeleteUser.mockResolvedValue(undefined);
    mockClearAuthCookie.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/users/me", { method: "DELETE" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockClearAuthCookie).toHaveBeenCalled();
  });
});
