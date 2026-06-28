import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "../page";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useParams: () => ({ token: "abc" }),
  usePathname: () => "/reset-password/abc",
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    landing: "/",
    login: "/login",
  },
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reset password form", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Set new password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
  });

  it("shows password too short error", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("shows password mismatch error", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New password"), "password12345");
    await user.type(screen.getByLabelText("Confirm new password"), "different12345");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("shows success state and navigates to login on button click", async () => {
    mockApiFetch.mockResolvedValue({});
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm new password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await screen.findByText("Password reset successfully!");
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "abc", password: "newpassword123" }),
    });

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockPush).toHaveBeenCalledWith("/login");
  });

  it("shows error on submit failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Token expired"));
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New password"), "newpassword123");
    await user.type(screen.getByLabelText("Confirm new password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await screen.findByText("Token expired");
  });
});
