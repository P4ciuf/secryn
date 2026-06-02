import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import RegisterPage from "@/features/auth/RegisterPage";

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

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the registration form", () => {
    renderWithRouter(<RegisterPage />);

    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });

  it("should render the AuthLayout title", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
  });

  it("should allow filling all fields", async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("John Doe"), "Jane Doe");
    await user.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwords[0]!, "password123");
    await user.type(passwords[1]!, "password123");

    expect(screen.getByPlaceholderText("John Doe")).toHaveValue("Jane Doe");
    expect(screen.getByPlaceholderText("you@example.com")).toHaveValue("jane@example.com");
  });

  it("should navigate to projects on form submit", async () => {
    const user = userEvent.setup();
    renderWithRouter(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("John Doe"), "Jane Doe");
    await user.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwords[0]!, "password123");
    await user.type(passwords[1]!, "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/projects");
  });

  it("should render terms of service and privacy links", () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });
});
