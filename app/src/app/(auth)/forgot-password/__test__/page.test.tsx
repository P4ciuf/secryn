import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useParams: () => ({}),
  usePathname: () => "/forgot-password",
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    landing: "/",
    login: "/login",
    forgotPassword: "/forgot-password",
  },
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the forgot password form", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows success state after submit", async () => {
    mockApiFetch.mockResolvedValue({});
    const user = userEvent.setup();

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), "test@test.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await screen.findByText(/check your inbox/i);
    expect(screen.getByText(/if an account with that email exists/i)).toBeInTheDocument();
  });

  it("shows error on submit failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText("Email address"), "test@test.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await screen.findByText("Network error");
  });
});
