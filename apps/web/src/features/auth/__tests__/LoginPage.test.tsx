import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import LoginPage from "@/features/auth/LoginPage";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the login form with email and password fields", () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("should render the AuthLayout title", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Welcome Back" })).toBeInTheDocument();
  });

  it("should allow typing in email and password fields", async () => {
    renderWithRouter(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("you@example.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("should navigate to projects on form submit", async () => {
    const user = userEvent.setup();
    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/projects");
  });

  it("should render the Remember me checkbox", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText("Remember me")).toBeInTheDocument();
  });

  it("should render the Forgot password link", () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });
});
