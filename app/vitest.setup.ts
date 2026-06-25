import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next-auth", () => {
  const mockSession = {
    user: { id: "mock-user-id", email: "mock@test.com", name: "mockuser" },
  };

  class AuthError extends Error {
    cause: unknown;
    constructor(message?: string, cause?: unknown) {
      super(message ?? "Authentication error");
      this.name = "AuthError";
      this.cause = cause;
    }
  }

  return {
    default: () => ({
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn().mockResolvedValue(mockSession),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }),
    AuthError,
  };
});
