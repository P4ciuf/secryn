import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginAction,
  registerAction,
  logoutAction,
  verifyAccountAction,
  resendVerificationEmailAction,
} from "../actions";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1", email: "user@test.com" } }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  AuthService: class {
    static Instance = vi.fn().mockResolvedValue({
      register: vi.fn(),
      verifyAccount: vi.fn(),
      sendVerificationEmail: vi.fn(),
    });
  },
}));

import { signIn, signOut, auth } from "@/auth";
import { AuthService } from "@/services/auth";

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signIn with credentials and redirectTo", async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);

    const result = await loginAction("test@example.com", "password123");

    expect(result.success).toBe(true);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("returns failure when signIn throws", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("Invalid credentials"));

    const result = await loginAction("bad@example.com", "wrong");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid credentials");
  });
});

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the user and then signs in", async () => {
    const mockAuthService = await AuthService.Instance(null);
    vi.mocked(mockAuthService.register).mockResolvedValue(undefined);
    vi.mocked(signIn).mockResolvedValue(undefined);

    const result = await registerAction({
      email: "new@example.com",
      password: "securepass",
      username: "newuser",
    });

    expect(result.success).toBe(true);
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "securepass",
      username: "newuser",
    });
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "new@example.com",
      password: "securepass",
      redirectTo: "/dashboard",
    });
  });

  it("returns failure when register throws", async () => {
    const mockAuthService = await AuthService.Instance(null);
    vi.mocked(mockAuthService.register).mockRejectedValue(new Error("Email already taken"));

    const result = await registerAction({
      email: "taken@example.com",
      password: "pass123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Email already taken");
  });
});

describe("logoutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signOut with redirectTo login", async () => {
    vi.mocked(signOut).mockResolvedValue(undefined);

    const result = await logoutAction();

    expect(result.success).toBe(true);
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("returns failure when signOut throws", async () => {
    vi.mocked(signOut).mockRejectedValue(new Error("Session error"));

    const result = await logoutAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Session error");
  });
});

describe("verifyAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls verifyAccount with the current user id and token", async () => {
    const mockAuthService = await AuthService.Instance(null);
    vi.mocked(mockAuthService.verifyAccount).mockResolvedValue(undefined);
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", email: "user@test.com" } });

    const result = await verifyAccountAction("verification-token-123");

    expect(result.success).toBe(true);
    expect(mockAuthService.verifyAccount).toHaveBeenCalledWith("user-1", "verification-token-123");
  });

  it("returns failure when verifyAccount throws", async () => {
    const mockAuthService = await AuthService.Instance(null);
    vi.mocked(mockAuthService.verifyAccount).mockRejectedValue(new Error("Already verified"));

    const result = await verifyAccountAction("verification-token-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Already verified");
  });
});

describe("resendVerificationEmailAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendVerificationEmail with the current user email", async () => {
    const mockAuthService = await AuthService.Instance(null);
    vi.mocked(mockAuthService.sendVerificationEmail).mockResolvedValue(undefined);
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", email: "user@test.com" } });

    const result = await resendVerificationEmailAction();

    expect(result.success).toBe(true);
    expect(mockAuthService.sendVerificationEmail).toHaveBeenCalledWith("user@test.com");
  });

  it("returns failure when sendVerificationEmail throws", async () => {
    const mockAuthService = await AuthService.Instance(null);
    vi.mocked(mockAuthService.sendVerificationEmail).mockRejectedValue(
      new Error("Email service unavailable"),
    );

    const result = await resendVerificationEmailAction();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Email service unavailable");
  });
});
