import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useParams: () => ({}),
  usePathname: () => "/login",
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    landing: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
    dashboard: { path: "/dashboard", children: {} },
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows MFA form when mfaRequired is true", async () => {
    mockApiFetch.mockResolvedValue({
      success: true,
      mfaRequired: true,
      mfaToken: "mfa-token-123",
    });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByText(/two-factor authentication is enabled/i);
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
  });

  it("shows error on login failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByText("Invalid credentials");
  });
});
