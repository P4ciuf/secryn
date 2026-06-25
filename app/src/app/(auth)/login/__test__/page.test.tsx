import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";

const { mockLoginAction } = vi.hoisted(() => ({ mockLoginAction: vi.fn() }));
vi.mock("@/actions/auth", () => ({
  loginAction: mockLoginAction,
}));

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/login",
  redirect: mockRedirect,
}));

vi.mock("@/data/routes", () => ({
  ROUTES: {
    landing: "/",
    login: "/login",
    register: "/register",
    forgotPassword: "/forgot-password",
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error on login failure", async () => {
    mockLoginAction.mockResolvedValue({
      success: false,
      error: "Invalid email or password",
    });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "bad@test.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to dashboard on successful login", async () => {
    mockLoginAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "good@test.com");
    await user.type(screen.getByLabelText(/password/i), "correctpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await vi.waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("renders links to register and forgot password", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
  });

  it("submits the form on Enter key press", async () => {
    mockLoginAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "enter@test.com");
    await user.type(screen.getByLabelText(/password/i), "enterpass{Enter}");

    await vi.waitFor(() => {
      expect(mockLoginAction).toHaveBeenCalledWith("enter@test.com", "enterpass");
    });
  });
});
